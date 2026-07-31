import { describe, expect, it } from "vitest";
import {
  replaceFileAtomically,
  runCli,
  type AtomicReplaceDependencies,
  type CliDependencies,
} from "../../../src/cli/run-cli.js";
import { CliInputFailure } from "../../../src/cli/contracts.js";
import type {
  DocumentFixPlan,
  DocumentSnapshot,
  Finding,
  ValidationResult,
} from "../../../src/validation/index.js";

function writer(onWrite: (text: string) => void): Pick<NodeJS.WriteStream, "write"> {
  return { write: ((text: string) => { onWrite(text); return true; }) as NodeJS.WriteStream["write"] };
}

function validation(document: DocumentSnapshot, findings: readonly Finding[] = []): ValidationResult {
  return {
    documentUri: document.uri,
    diagramCount: document.languageId === "markdown" ? 0 : 1,
    valid: !findings.some((finding) => finding.severity === "error"),
    findings,
  };
}

async function invoke(options: {
  readonly argv?: readonly string[];
  readonly files?: readonly string[];
  readonly readFailure?: ReadonlySet<string>;
  readonly findings?: readonly Finding[];
  readonly configFailure?: boolean;
  readonly discoveryFailure?: boolean;
  readonly fixPlan?: (document: DocumentSnapshot) => DocumentFixPlan;
  readonly writeFailure?: ReadonlySet<string>;
} = {}): Promise<{
  code: number;
  stdout: string;
  stderr: string;
  documents: DocumentSnapshot[];
  writes: { readonly path: string; readonly text: string }[];
}> {
  let stdout = "";
  let stderr = "";
  const documents: DocumentSnapshot[] = [];
  const writes: { readonly path: string; readonly text: string }[] = [];
  const files = options.files ?? ["/workspace/diagram.mmd"];
  const dependencies: Partial<CliDependencies> = {
    cwd: () => "/workspace",
    loadConfig: async () => {
      if (options.configFailure) throw new CliInputFailure("bad config");
      return { rootDirectory: "/workspace", config: {} };
    },
    discover: async () => {
      if (options.discoveryFailure) throw new CliInputFailure("bad discovery");
      return files;
    },
    readFile: (async (path: string) => {
      if (options.readFailure?.has(path)) throw new Error("private read detail");
      return path.endsWith(".md") ? "# Guide\n" : "flowchart TD";
    }) as unknown as CliDependencies["readFile"],
    validate: async (document) => {
      documents.push(document);
      return validation(document, options.findings);
    },
    planFixes: async (document) => {
      documents.push(document);
      return options.fixPlan?.(document) ?? {
        status: "unchanged", edits: [], originalResult: validation(document, options.findings),
      };
    },
    replaceFile: async (path: string, text: string) => {
      if (options.writeFailure?.has(path)) throw new Error("private write detail");
      writes.push({ path, text });
    },
    stdout: writer((text) => { stdout += text; }),
    stderr: writer((text) => { stderr += text; }),
  };
  return {
    code: await runCli(options.argv ?? ["diagram.mmd"], dependencies),
    stdout,
    stderr,
    documents,
    writes,
  };
}

const ruleError: Finding = {
  code: "rule/example", severity: "error", message: "rule", source: "rule", locationPrecision: "document",
};
const systemError: Finding = {
  code: "system/parser-timeout", severity: "error", message: "timeout", source: "system", locationPrecision: "document",
};

describe("runCli", () => {
  it("uses strict 3 > 2 > 1 > 0 exit precedence", async () => {
    await expect(invoke({ findings: [ruleError, systemError] })).resolves.toMatchObject({ code: 3 });
    await expect(invoke({ findings: [ruleError], readFailure: new Set(["/workspace/other.md"]), files: [
      "/workspace/diagram.mmd", "/workspace/other.md",
    ] })).resolves.toMatchObject({ code: 2 });
    await expect(invoke({ findings: [ruleError] })).resolves.toMatchObject({ code: 1 });
    await expect(invoke({ findings: [{
      code: "rule/warning", severity: "warning", message: "warning", source: "rule", locationPrecision: "document",
    }] })).resolves.toMatchObject({ code: 0 });
  });

  it("maps Markdown extensions case-insensitively and validates sorted discovery order", async () => {
    const invocation = await invoke({ files: ["/workspace/guide.MD", "/workspace/diagram.mmd"] });
    expect(invocation.documents.map((document) => document.languageId)).toEqual(["markdown", "mermaid"]);
  });

  it("reports bounded read failures, validates readable files, and emits partial JSON", async () => {
    const invocation = await invoke({
      argv: ["--format", "json", "."],
      files: ["/workspace/b.md", "/workspace/a.mmd"],
      readFailure: new Set(["/workspace/b.md"]),
    });
    expect(invocation.code).toBe(2);
    expect(invocation.stderr).toBe("/workspace/b.md: Unable to read input file\n");
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      schemaVersion: 2,
      complete: false,
      valid: false,
      inputErrors: [{ code: "input/read-failed", path: "/workspace/b.md" }],
      documents: [{ uri: "file:///workspace/a.mmd" }],
    });
    expect(invocation.stdout).not.toContain("private read detail");
  });

  it("emits JSON even when all discovered files are unreadable", async () => {
    const invocation = await invoke({
      argv: ["--format", "json", "."],
      files: ["/workspace/a.md"],
      readFailure: new Set(["/workspace/a.md"]),
    });
    expect(invocation.code).toBe(2);
    expect(JSON.parse(invocation.stdout)).toMatchObject({ complete: false, documents: [], summary: { inputErrors: 1 } });
  });

  it("keeps fatal config and discovery failures stderr-only", async () => {
    await expect(invoke({ configFailure: true })).resolves.toMatchObject({ code: 2, stdout: "", stderr: "bad config\n" });
    await expect(invoke({ discoveryFailure: true })).resolves.toMatchObject({
      code: 2, stdout: "", stderr: "bad discovery\n",
    });
  });

  it("bounds unexpected config and discovery errors", async () => {
    let stderr = "";
    const dependencies: Partial<CliDependencies> = {
      cwd: () => "/workspace",
      loadConfig: async () => { throw new Error("private config detail"); },
      stdout: writer(() => {}),
      stderr: writer((text) => { stderr += text; }),
    };
    await expect(runCli(["diagram.mmd"], dependencies)).resolves.toBe(2);
    expect(stderr).toBe("Unable to resolve input files\n");
  });

  it("continues later repository documents after a document-local system result", async () => {
    const invocation = await invoke({
      files: ["/workspace/first.md", "/workspace/second.mmd"],
      findings: [systemError],
    });
    expect(invocation.code).toBe(3);
    expect(invocation.documents.map((document) => document.uri)).toEqual([
      "file:///workspace/first.md", "file:///workspace/second.mmd",
    ]);
  });

  it("handles version and invalid format before config or discovery", async () => {
    await expect(invoke({ argv: ["--version"], configFailure: true })).resolves.toMatchObject({
      code: 0, stdout: "0.3.1\n", stderr: "", documents: [],
    });
    await expect(invoke({ argv: ["--format", "yaml"] })).resolves.toMatchObject({ code: 2, stdout: "" });
  });

  it("previews changed output without writing and keeps the original result at top level", async () => {
    const invocation = await invoke({
      argv: ["--fix-dry-run", "--format", "json", "diagram.mmd"],
      findings: [{ code: "example/fix", severity: "warning", message: "fix", source: "rule",
        locationPrecision: "exact", span: { startOffset: 0, endOffset: 1 },
        fixes: [{ span: { startOffset: 0, endOffset: 1 }, newText: "F" }] }],
      fixPlan: (document) => ({
        status: "changed", edits: [{ span: { startOffset: 0, endOffset: 1 }, newText: "F" }],
        originalResult: validation(document, [{ code: "example/fix", severity: "warning", message: "fix",
          source: "rule", locationPrecision: "exact", span: { startOffset: 0, endOffset: 1 },
          fixes: [{ span: { startOffset: 0, endOffset: 1 }, newText: "F" }] }]),
        output: "Flowchart TD",
        proposedResult: validation({ ...document, text: "Flowchart TD" }),
      }),
    });
    expect(invocation.writes).toEqual([]);
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      summary: { warnings: 1 },
      documents: [{ findings: [{ code: "example/fix" }], fix: {
        status: "previewed", editCount: 1, output: "Flowchart TD",
        proposedResult: { valid: true, findings: [] },
      } }],
    });
  });

  it("keeps the original result after preparation fails and continues later safe plans", async () => {
    const files = ["/workspace/c.mmd", "/workspace/a.mmd", "/workspace/b.mmd"];
    const invocation = await invoke({
      argv: ["--fix", "--format", "json", "."], files,
      writeFailure: new Set(["/workspace/b.mmd"]),
      fixPlan: (document) => ({
        status: "changed", edits: [{ span: { startOffset: 0, endOffset: 1 }, newText: "F" }],
        originalResult: validation(document, [{ code: "example/fix", severity: "error", message: "fix",
          source: "rule", locationPrecision: "exact", fixes: [{ span: { startOffset: 0, endOffset: 1 }, newText: "F" }] }]),
        output: "Flowchart TD",
        proposedResult: validation({ ...document, text: "Flowchart TD" }),
      }),
    });
    expect(invocation.code).toBe(2);
    expect(invocation.writes.map(({ path }) => path)).toEqual(["/workspace/a.mmd", "/workspace/c.mmd"]);
    expect(invocation.stderr).toBe("/workspace/b.mmd: Unable to write input file\n");
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      complete: false,
      inputErrors: [{ code: "input/write-failed", path: "/workspace/b.mmd" }],
      documents: [
        { uri: "file:///workspace/a.mmd", valid: true, fix: { status: "applied" } },
        { uri: "file:///workspace/b.mmd", valid: false, fix: { status: "write-failed" } },
        { uri: "file:///workspace/c.mmd", valid: true, fix: { status: "applied" } },
      ],
    });
  });

  it("rejects mutually exclusive fix modes before loading config", async () => {
    await expect(invoke({ argv: ["--fix", "--fix-dry-run", "diagram.mmd"], configFailure: true }))
      .resolves.toMatchObject({ code: 2, documents: [] });
  });
});

describe("replaceFileAtomically", () => {
  it("cleans a partially prepared temporary file without renaming the target", async () => {
    const events: string[] = [];
    const handle = {
      writeFile: async () => {
        events.push("write");
        throw new Error("storage full");
      },
      chmod: async () => { events.push("chmod"); },
      sync: async () => { events.push("sync"); },
      close: async () => { events.push("close"); },
    };
    const dependencies: Partial<AtomicReplaceDependencies> = {
      stat: (async () => ({ mode: 0o100744 })) as unknown as AtomicReplaceDependencies["stat"],
      createTemporaryPath: () => "/workspace/.diagram.mmd.tmp",
      open: (async (path: string, flags: string, mode: number) => {
        events.push(`open:${path}:${flags}:${mode.toString(8)}`);
        return handle;
      }) as unknown as AtomicReplaceDependencies["open"],
      rename: async () => { events.push("rename"); },
      unlink: async (path) => { events.push(`unlink:${path}`); },
    };

    await expect(replaceFileAtomically("/workspace/diagram.mmd", "fixed", dependencies))
      .rejects.toThrow("storage full");
    expect(events).toEqual([
      "open:/workspace/.diagram.mmd.tmp:wx:744",
      "write",
      "close",
      "unlink:/workspace/.diagram.mmd.tmp",
    ]);
  });

  it("cleans the owned temporary file and propagates an atomic rename failure", async () => {
    const events: string[] = [];
    const renameFailure = new Error("rename unavailable");
    const handle = {
      writeFile: async () => { events.push("write"); },
      chmod: async () => { events.push("chmod"); },
      sync: async () => { events.push("sync"); },
      close: async () => { events.push("close"); },
    };
    const dependencies: Partial<AtomicReplaceDependencies> = {
      stat: (async () => ({ mode: 0o100640 })) as unknown as AtomicReplaceDependencies["stat"],
      createTemporaryPath: () => "/workspace/.diagram.mmd.tmp",
      open: (async () => handle) as unknown as AtomicReplaceDependencies["open"],
      rename: async () => {
        events.push("rename");
        throw renameFailure;
      },
      unlink: async (path) => { events.push(`unlink:${path}`); },
    };

    await expect(replaceFileAtomically("/workspace/diagram.mmd", "fixed", dependencies))
      .rejects.toBe(renameFailure);
    expect(events).toEqual([
      "write",
      "chmod",
      "sync",
      "close",
      "rename",
      "unlink:/workspace/.diagram.mmd.tmp",
    ]);
  });
});
