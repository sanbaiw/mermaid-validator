import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  LspResponseError,
  StdioLspClient,
  type StdioLspClientOptions,
} from "../../helpers/lsp/stdio-client.js";

const execFileAsync = promisify(execFile);
const clients: StdioLspClient[] = [];
const OMITTED_INITIALIZATION_OPTIONS = Symbol("omitted initialization options");

interface PublishDiagnostics {
  readonly uri: string;
  readonly version?: number;
  readonly diagnostics: readonly {
    readonly range: {
      readonly start: { readonly line: number; readonly character: number };
      readonly end: { readonly line: number; readonly character: number };
    };
    readonly severity?: number;
    readonly code?: string | number;
    readonly source?: string;
    readonly message: string;
  }[];
}

const capableClient = {
  workspace: { workspaceEdit: { documentChanges: true } },
  textDocument: {
    codeAction: {
      codeActionLiteralSupport: { codeActionKind: { valueSet: ["quickfix"] } },
    },
  },
};

async function initialize(
  client: StdioLspClient,
  capabilities: object = capableClient,
  initializationOptions: unknown | typeof OMITTED_INITIALIZATION_OPTIONS = { debounceMs: 0 },
): Promise<Record<string, unknown>> {
  const result = await client.request<Record<string, unknown>>("initialize", {
    processId: null,
    rootUri: null,
    capabilities,
    ...(initializationOptions === OMITTED_INITIALIZATION_OPTIONS ? {} : { initializationOptions }),
  });
  client.notify("initialized", {});
  return result;
}

function client(options?: StdioLspClientOptions): StdioLspClient {
  const value = new StdioLspClient(options);
  clients.push(value);
  return value;
}

function offsetAt(text: string, position: { readonly line: number; readonly character: number }): number {
  const lines = text.split("\n");
  return lines.slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0)
    + position.character;
}

afterEach(async () => {
  await Promise.all(clients.splice(0).map(async (value) => { await value.dispose(); }));
});

beforeAll(async () => {
  await execFileAsync("pnpm", ["build"], { cwd: resolve(".") });
});

describe("built stdio language server", () => {
  it("rejects every non-stdio invocation before writing protocol output", async () => {
    for (const arguments_ of [[], ["--socket=1234"], ["--stdio", "extra"]]) {
      await expect(execFileAsync(process.execPath, [resolve("dist/lsp/main.js"), ...arguments_]))
        .rejects.toMatchObject({ code: 2, stdout: "", stderr: "Usage: mermaid-validator-language-server --stdio\n" });
    }
  });

  it("advertises only the exact capable-client Stage 4 surface and returns invalid params", async () => {
    const valid = client();
    await expect(initialize(valid)).resolves.toEqual({
      capabilities: {
        positionEncoding: "utf-16",
        textDocumentSync: { openClose: true, change: 2 },
        codeActionProvider: { codeActionKinds: ["quickfix"] },
      },
      serverInfo: { name: "mermaid-diagram-validator", version: "0.3.0" },
    });
    await expect(valid.shutdown()).resolves.toEqual({ code: 0, signal: null });
    expect(valid.stderr).toBe("");

    const incapable = client();
    const refactorOnly = {
      workspace: { workspaceEdit: { documentChanges: true } },
      textDocument: {
        codeAction: {
          codeActionLiteralSupport: { codeActionKind: { valueSet: ["refactor"] } },
        },
      },
    };
    await expect(initialize(incapable, refactorOnly, null)).resolves.toEqual({
      capabilities: {
        positionEncoding: "utf-16",
        textDocumentSync: { openClose: true, change: 2 },
      },
      serverInfo: { name: "mermaid-diagram-validator", version: "0.3.0" },
    });
    incapable.notify("textDocument/didOpen", {
      textDocument: {
        uri: "untitled:incapable",
        languageId: "mermaid",
        version: 1,
        text: "flowchart LR\nA[\"`# Build`\"]",
      },
    });
    const incapableDiagnostics = await incapable.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === "untitled:incapable" && params.diagnostics.length > 0,
    );
    await expect(incapable.request("textDocument/codeAction", {
      textDocument: { uri: "untitled:incapable" },
      range: incapableDiagnostics.diagnostics[0]!.range,
      context: { diagnostics: incapableDiagnostics.diagnostics },
    })).resolves.toEqual([]);
    await incapable.shutdown();

    const omitted = client();
    await expect(initialize(omitted, {}, OMITTED_INITIALIZATION_OPTIONS)).resolves.toMatchObject({
      capabilities: { textDocumentSync: { openClose: true, change: 2 } },
      serverInfo: { name: "mermaid-diagram-validator", version: "0.3.0" },
    });
    await omitted.shutdown();

    const invalid = client();
    await expect(initialize(invalid, {}, { unknown: true })).rejects.toEqual(
      new LspResponseError(-32602, "Unknown initialization option: unknown"),
    );
    const longInvalid = client();
    const longKey = `unknown-${"x".repeat(400)}`;
    try {
      await initialize(longInvalid, {}, { [longKey]: true });
      throw new Error("Expected long initialization error");
    } catch (error) {
      expect(error).toBeInstanceOf(LspResponseError);
      expect(error).toMatchObject({ code: -32602 });
      expect((error as Error).message.length).toBeLessThanOrEqual(256);
    }
  });

  it("validates unsaved opaque-URI buffers, returns a current planner-backed Quick Fix, and clears on close", async () => {
    const value = client();
    await initialize(value);
    const uri = "untitled:stage4-fix";
    const text = "flowchart LR\nA[\"`# Build`\"]";
    value.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "mermaid", version: 1, text },
    });
    const published = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === uri && params.version === 1 && params.diagnostics.length > 0,
    );
    expect(published.diagnostics).toEqual([
      expect.objectContaining({
        code: "flowchart/no-markdown-heading-in-label",
        severity: 2,
        source: "mermaid-validator",
        range: { start: { line: 1, character: 4 }, end: { line: 1, character: 6 } },
      }),
    ]);

    const actions = await value.request<readonly Record<string, unknown>[]>("textDocument/codeAction", {
      textDocument: { uri },
      range: published.diagnostics[0]!.range,
      context: { diagnostics: published.diagnostics },
    });
    expect(actions).toEqual([{
      title: "Apply all safe Mermaid fixes in this document",
      kind: "quickfix",
      diagnostics: published.diagnostics,
      edit: {
        documentChanges: [{
          textDocument: { uri, version: 1 },
          edits: [{ range: published.diagnostics[0]!.range, newText: "" }],
        }],
      },
    }]);

    value.notify("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: "flowchart LR\nA[\"`Build`\"]" }],
    });
    await expect(value.request("textDocument/codeAction", {
      textDocument: { uri },
      range: published.diagnostics[0]!.range,
      context: { diagnostics: published.diagnostics },
    })).resolves.toEqual([]);
    await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === uri && params.version === 2,
    );

    value.notify("textDocument/didClose", { textDocument: { uri } });
    await expect(value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === uri && params.diagnostics.length === 0,
    )).resolves.toMatchObject({ uri, diagnostics: [] });
    await value.shutdown();
  });

  it("publishes only the newest rapid version and keeps unsupported language ids empty", async () => {
    const value = client();
    await initialize(value, capableClient, { debounceMs: 150 });
    const uri = "virtual-mermaid:rapid";
    value.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "mermaid",
        version: 1,
        text: "flowchart LR\nA[\"`# Old`\"]",
      },
    });
    value.notify("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: "flowchart LR\nA[\"`# New`\"]" }],
    });
    const current = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === uri && params.version === 2,
    );
    expect(current.diagnostics).toHaveLength(1);

    const unsupported = "virtual-mermaid:unsupported";
    value.notify("textDocument/didOpen", {
      textDocument: { uri: unsupported, languageId: "mdx", version: 1, text: "broken" },
    });
    await expect(value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === unsupported,
    )).resolves.toMatchObject({ uri: unsupported, version: 1, diagnostics: [] });
    await expect(value.shutdown()).resolves.toEqual({ code: 0, signal: null });
    const publications = value.notificationHistory
      .filter(({ method }) => method === "textDocument/publishDiagnostics")
      .map(({ params }) => params as PublishDiagnostics)
      .filter((params) => params.uri === uri);
    expect(publications.some((params) => params.version === 1 && params.diagnostics.length > 0)).toBe(false);
  });

  it("projects Markdown host ranges and private rule severity without reading a path", async () => {
    const value = client();
    await initialize(value, capableClient, {
      debounceMs: 0,
      rules: { "flowchart/no-markdown-heading-in-label": "error" },
    });
    const uri = "custom+memory://workspace/readme.md";
    const text = "> ```mermaid\n> flowchart LR\n> A[\"`# Build`\"]\n> ```";
    value.notify("textDocument/didOpen", {
      textDocument: { uri, languageId: "markdown", version: 9, text },
    });
    const published = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === uri && params.version === 9 && params.diagnostics.length > 0,
    );
    expect(published.diagnostics[0]).toMatchObject({
      code: "flowchart/no-markdown-heading-in-label",
      severity: 1,
      source: "mermaid-validator",
      range: { start: { line: 2, character: 6 }, end: { line: 2, character: 8 } },
    });
    await value.shutdown();
  });

  it("projects real-process Unicode, syntax, and injected system Findings", async () => {
    const value = client();
    await initialize(value);

    const unicodeUri = "untitled:unicode";
    const unicodeText = "flowchart LR\r\nX[\"😀e\u0301\"]\r\nA[\"`# Build`\"]";
    value.notify("textDocument/didOpen", {
      textDocument: {
        uri: unicodeUri,
        languageId: "mermaid",
        version: 1,
        text: unicodeText,
      },
    });
    const unicode = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === unicodeUri && params.version === 1 && params.diagnostics.length > 0,
    );
    expect(unicode.diagnostics[0]).toMatchObject({
      code: "flowchart/no-markdown-heading-in-label",
      source: "mermaid-validator",
    });
    const unicodeRange = unicode.diagnostics[0]!.range;
    expect(unicodeText.slice(
      offsetAt(unicodeText, unicodeRange.start),
      offsetAt(unicodeText, unicodeRange.end),
    )).toBe("# ");

    const syntaxUri = "untitled:syntax";
    value.notify("textDocument/didOpen", {
      textDocument: {
        uri: syntaxUri,
        languageId: "mermaid",
        version: 1,
        text: "flowchart LR\nA -x-> B\n",
      },
    });
    const syntax = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === syntaxUri && params.version === 1 && params.diagnostics.length > 0,
    );
    expect(syntax.diagnostics[0]).toMatchObject({
      code: "mermaid/syntax-error",
      severity: 1,
      source: "mermaid-validator",
    });
    expect(syntax.diagnostics[0]!.message).toMatch(/^\[approximate location\] /);
    expect(syntax.diagnostics[0]!.message.length).toBeLessThanOrEqual(256);

    const regressionUri = "untitled:sequence-note.md";
    const regressionText = await readFile("tests/fixtures/markdown/sequence-note-semicolon.md", "utf8");
    value.notify("textDocument/didOpen", {
      textDocument: {
        uri: regressionUri,
        languageId: "markdown",
        version: 2,
        text: regressionText,
      },
    });
    const regression = await value.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === regressionUri && params.version === 2 && params.diagnostics.length > 0,
    );
    expect(regression.diagnostics[0]).toMatchObject({
      code: "mermaid/syntax-error",
      severity: 1,
      source: "mermaid-validator",
      message: "[approximate location] Mermaid syntax error: Parse error near diagram line 15\nHelp: In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.",
    });
    const noteOffset = regressionText.indexOf("    Note over B: valid history");
    const noteLine = regressionText.slice(0, noteOffset).split("\n").length - 1;
    expect(regression.diagnostics[0]!.range.start.line).toBe(noteLine);
    expect(regression.diagnostics[0]!.range.end.line).toBe(noteLine);
    await expect(value.shutdown()).resolves.toEqual({ code: 0, signal: null });

    const system = client({
      entry: resolve("tests/fixtures/lsp/system-finding-server.mjs"),
    });
    await initialize(system);
    const systemUri = "untitled:system";
    system.notify("textDocument/didOpen", {
      textDocument: {
        uri: systemUri,
        languageId: "mermaid",
        version: 7,
        text: "flowchart LR\nA --> B\n",
      },
    });
    const systemFinding = await system.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === systemUri && params.version === 7 && params.diagnostics.length > 0,
    );
    expect(systemFinding.diagnostics).toEqual([expect.objectContaining({
      code: "system/parser-runtime-failed",
      severity: 1,
      source: "mermaid-validator",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
    })]);
    expect(systemFinding.diagnostics[0]!.message.length).toBeLessThanOrEqual(256);
    await expect(system.shutdown()).resolves.toEqual({ code: 0, signal: null });
  }, 30_000);

  it("uses unsaved file-URI bytes instead of different disk contents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mermaid-validator-open-buffer-"));
    try {
      const path = join(directory, "diagram.mmd");
      await writeFile(path, "flowchart LR\nA --> B\n");
      const uri = pathToFileURL(path).href;
      const value = client();
      await initialize(value);
      value.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: "mermaid",
          version: 5,
          text: "flowchart LR\nA[\"`# Unsaved`\"]\n",
        },
      });
      const published = await value.waitForNotification<PublishDiagnostics>(
        "textDocument/publishDiagnostics",
        (params) => params.uri === uri && params.version === 5,
      );
      expect(published.diagnostics).toEqual([
        expect.objectContaining({ code: "flowchart/no-markdown-heading-in-label" }),
      ]);
      await value.shutdown();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses the official exit status for an exit notification without shutdown", async () => {
    const value = client();
    await initialize(value);
    value.notify("exit");
    await expect(value.waitForExit(5_000)).resolves.toMatchObject({ code: 1, signal: null });
  });
});
