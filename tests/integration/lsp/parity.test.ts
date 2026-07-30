import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { TextDocument } from "vscode-languageserver-textdocument";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { StdioLspClient } from "../../helpers/lsp/stdio-client.js";

const execFileAsync = promisify(execFile);
const clients: StdioLspClient[] = [];

interface CliFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly span?: { readonly startOffset: number; readonly endOffset: number };
  readonly locationPrecision: "exact" | "approximate" | "document";
  readonly help?: string;
}

interface CliDocument {
  readonly languageId: "mermaid" | "markdown";
  readonly findings: readonly CliFinding[];
}

interface CliJson {
  readonly documents: readonly CliDocument[];
}

interface LspDiagnostic {
  readonly range: {
    readonly start: { readonly line: number; readonly character: number };
    readonly end: { readonly line: number; readonly character: number };
  };
  readonly severity: 1 | 2 | 3;
  readonly code: string;
  readonly source: string;
  readonly message: string;
}

interface PublishDiagnostics {
  readonly uri: string;
  readonly version: number;
  readonly diagnostics: readonly LspDiagnostic[];
}

beforeAll(async () => {
  await execFileAsync("pnpm", ["build"], { cwd: resolve(".") });
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map(async (client) => { await client.dispose(); }));
});

async function cliJson(arguments_: readonly string[]): Promise<CliJson> {
  try {
    const { stdout } = await execFileAsync(process.execPath, [resolve("dist/cli/main.js"), ...arguments_]);
    return JSON.parse(stdout) as CliJson;
  } catch (error) {
    const failure = error as { readonly code?: number; readonly stdout?: string };
    if (failure.code !== 1 || !failure.stdout) throw error;
    return JSON.parse(failure.stdout) as CliJson;
  }
}

async function lspResults(
  sources: readonly { readonly uri: string; readonly languageId: "mermaid" | "markdown"; readonly text: string }[],
  rules?: object,
): Promise<readonly PublishDiagnostics[]> {
  const client = new StdioLspClient();
  clients.push(client);
  await client.request("initialize", {
    processId: null,
    rootUri: null,
    capabilities: {},
    initializationOptions: { debounceMs: 0, ...(rules === undefined ? {} : { rules }) },
  });
  client.notify("initialized", {});
  const results: PublishDiagnostics[] = [];
  for (const [index, source] of sources.entries()) {
    const version = index + 1;
    client.notify("textDocument/didOpen", {
      textDocument: { ...source, version },
    });
    results.push(await client.waitForNotification<PublishDiagnostics>(
      "textDocument/publishDiagnostics",
      (params) => params.uri === source.uri && params.version === version,
    ));
  }
  await client.shutdown();
  return results;
}

function comparableCli(findings: readonly CliFinding[]): readonly object[] {
  return findings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    message: `${finding.locationPrecision === "approximate"
      ? "[approximate location] "
      : finding.locationPrecision === "document"
        ? "[document-level location] "
        : ""}${finding.message}${finding.help === undefined ? "" : `\nHelp: ${finding.help}`}`,
    span: finding.span,
  }));
}

function comparableLsp(text: string, diagnostics: readonly LspDiagnostic[]): readonly object[] {
  const document = TextDocument.create("virtual:parity", "mermaid", 1, text);
  const severity = { 1: "error", 2: "warning", 3: "info" } as const;
  return diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    severity: severity[diagnostic.severity],
    message: diagnostic.message,
    span: {
      startOffset: document.offsetAt(diagnostic.range.start),
      endOffset: document.offsetAt(diagnostic.range.end),
    },
  }));
}

describe("CLI and LSP finding parity", () => {
  it("preserves ordered codes, severities, messages, and host UTF-16 offsets", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mermaid-validator-lsp-parity-"));
    try {
      const standalone = "flowchart LR\nA[\"`# Build`\"]\n";
      const markdown = "> ```mermaid\n> flowchart LR\n> A[\"`# Build`\"]\n> ```\n";
      const standalonePath = join(directory, "diagram.mmd");
      const markdownPath = join(directory, "guide.md");
      const configPath = join(directory, "mermaid-validator.config.json");
      await writeFile(standalonePath, standalone);
      await writeFile(markdownPath, markdown);
      await writeFile(configPath, JSON.stringify({
        rules: { "flowchart/no-markdown-heading-in-label": "error" },
      }));
      const sources = [
        { uri: "virtual:standalone", languageId: "mermaid" as const, text: standalone },
        { uri: "virtual:markdown", languageId: "markdown" as const, text: markdown },
      ];

      for (const configuration of [
        { cli: ["--format", "json", standalonePath, markdownPath], lsp: undefined },
        {
          cli: ["--format", "json", "--config", configPath, standalonePath, markdownPath],
          lsp: { "flowchart/no-markdown-heading-in-label": "error" },
        },
      ]) {
        const cli = await cliJson(configuration.cli);
        const lsp = await lspResults(sources, configuration.lsp);
        expect(cli.documents).toHaveLength(2);
        expect(lsp).toHaveLength(2);
        for (const [index, source] of sources.entries()) {
          expect(comparableLsp(source.text, lsp[index]!.diagnostics))
            .toEqual(comparableCli(cli.documents[index]!.findings));
          expect(lsp[index]!.diagnostics.every(({ source: owner }) => owner === "mermaid-validator")).toBe(true);
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 45_000);
});
