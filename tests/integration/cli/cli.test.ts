import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const entry = resolve("dist/cli/main.js");
let temporaryDirectory: string;

async function run(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [entry, ...args], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 15_000,
    });
    return { status: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { status: failure.code ?? -1, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

beforeAll(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "mermaid-validator-cli-"));
  await writeFile(join(temporaryDirectory, "valid.MERMAID"), "flowchart TD\n  A --> B\n");
  await writeFile(join(temporaryDirectory, "valid.MMD"), "sequenceDiagram\n  A->>B: Hi\n");
});

afterAll(async () => {
  await rm(temporaryDirectory, { recursive: true, force: true });
});

describe("built CLI", () => {
  it.each([
    "fixtures/compatibility/flowchart/valid-minimal.mmd",
    "fixtures/compatibility/sequence/valid-minimal.mmd",
    "fixtures/compatibility/pie/valid-minimal.mmd",
    "fixtures/compatibility/class/valid-minimal.mmd",
    "fixtures/compatibility/state/valid-minimal.mmd",
  ])("accepts target fixture %s", async (path) => {
    await expect(run([path])).resolves.toEqual({ status: 0, stdout: "", stderr: "" });
  });

  it("accepts both supported extensions case-insensitively", async () => {
    await expect(run([join(temporaryDirectory, "valid.MERMAID")])).resolves.toMatchObject({ status: 0 });
    await expect(run([join(temporaryDirectory, "valid.MMD")])).resolves.toMatchObject({ status: 0 });
  });

  it("prints syntax and unsupported-family findings to stdout", async () => {
    const invalid = await run(["fixtures/compatibility/flowchart/invalid-edge.mmd"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toMatch(/invalid-edge\.mmd:\d+:\d+: error mermaid\/syntax-error:/);
    expect(invalid.stderr).toBe("");

    const unsupported = await run(["tests/fixtures/cli/unsupported-gantt.mmd"]);
    expect(unsupported).toMatchObject({ status: 1, stderr: "" });
    expect(unsupported.stdout).toContain("error mermaid/unsupported-diagram-type: Mermaid diagram type \"gantt\" is not supported");
  });

  it("emits one JSON-v1 document equivalent to the validation result", async () => {
    const invocation = await run(["--format", "json", "fixtures/compatibility/flowchart/invalid-edge.mmd"]);
    expect(invocation.status).toBe(1);
    expect(invocation.stderr).toBe("");
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      schemaVersion: 1,
      tool: { name: "mermaid-diagram-validator", version: "0.1.0" },
      valid: false,
      findings: [{ code: "mermaid/syntax-error", source: "mermaid" }],
    });
  });

  it("handles version and help without starting validation", async () => {
    await expect(run(["--version"])).resolves.toEqual({ status: 0, stdout: "0.1.0\n", stderr: "" });
    const help = await run(["--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: mermaid-validator");
    expect(help.stderr).toBe("");
  });

  it.each([
    [["--format", "yaml", "fixtures/compatibility/flowchart/valid-minimal.mmd"], /must be either/],
    [[], /missing required argument/],
    [["README.md"], /Unsupported file extension/],
    [["missing.mmd"], /Cannot read Mermaid file/],
    [["fixtures/compatibility/flowchart"], /Unsupported file extension|Cannot read Mermaid file/],
  ] as const)("returns 2 for input error %j", async (args, message) => {
    const invocation = await run([...args]);
    expect(invocation.status).toBe(2);
    expect(invocation.stdout).toBe("");
    expect(invocation.stderr).toMatch(message);
  });

  it("preserves the shebang and package bin mapping", async () => {
    expect((await readFile(entry, "utf8")).startsWith("#!/usr/bin/env node\n")).toBe(true);
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { bin?: Record<string, string> };
    expect(manifest.bin).toEqual({ "mermaid-validator": "./dist/cli/main.js" });
  });
});
