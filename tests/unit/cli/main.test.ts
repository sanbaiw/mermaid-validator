import { describe, expect, it } from "vitest";
import { runCli, type CliDependencies } from "../../../src/cli/main.js";
import { CliInputFailure } from "../../../src/cli/contracts.js";
import type { DocumentSnapshot, Finding, ValidationResult } from "../../../src/validation/index.js";

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
} = {}): Promise<{ code: number; stdout: string; stderr: string; documents: DocumentSnapshot[] }> {
  let stdout = "";
  let stderr = "";
  const documents: DocumentSnapshot[] = [];
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
    stdout: writer((text) => { stdout += text; }),
    stderr: writer((text) => { stderr += text; }),
  };
  return {
    code: await runCli(options.argv ?? ["diagram.mmd"], dependencies),
    stdout,
    stderr,
    documents,
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
      code: 0, stdout: "0.1.0\n", stderr: "", documents: [],
    });
    await expect(invoke({ argv: ["--format", "yaml"] })).resolves.toMatchObject({ code: 2, stdout: "" });
  });
});
