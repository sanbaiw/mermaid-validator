import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const entry = resolve("dist/cli/main.js");
let temporaryDirectory: string;
let validRepository: string;
let configRepository: string;

async function run(
  args: string[],
  cwd = process.cwd(),
): Promise<{ status: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [entry, ...args], {
      cwd,
      encoding: "utf8",
      timeout: 20_000,
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
  await writeFile(join(temporaryDirectory, "empty.md"), "# No diagrams\n");
  await writeFile(join(temporaryDirectory, "embedded-invalid.md"), [
    "# Guide", "> ```mermaid", "> flowchart TD", ">   A -- B", "> ```", "",
  ].join("\n"));

  validRepository = join(temporaryDirectory, "valid-repository");
  await mkdir(join(validRepository, ".github"), { recursive: true });
  await mkdir(join(validRepository, "docs"), { recursive: true });
  await mkdir(join(validRepository, "node_modules"), { recursive: true });
  await writeFile(join(validRepository, ".github", "workflow.MMD"), "flowchart TD\n  A-->B\n");
  await writeFile(join(validRepository, "docs", "guide.md"), "```mermaid\nstateDiagram-v2\n  [*] --> Ready\n```\n");
  await writeFile(join(validRepository, "docs", "ignored.md"), "```mermaid\nflowchart TD\n  A -- B\n```\n");
  await writeFile(join(validRepository, "node_modules", "bad.md"), "```mermaid\nflowchart TD\n  A -- B\n```\n");
  await writeFile(join(validRepository, ".gitignore"), "docs/ignored.md\n");

  configRepository = join(temporaryDirectory, "config-repository");
  await mkdir(join(configRepository, "drafts"), { recursive: true });
  await writeFile(join(configRepository, "mermaid-validator.config.json"), JSON.stringify({ ignore: ["drafts/**"] }));
  await writeFile(join(configRepository, "guide.md"), "```mermaid\nflowchart TD\n  A-->B\n```\n");
  await writeFile(join(configRepository, "drafts", "bad.md"), "```mermaid\nflowchart TD\n  A -- B\n```\n");
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

  it("accepts supported extensions case-insensitively and zero-block Markdown", async () => {
    await expect(run([join(temporaryDirectory, "valid.MERMAID")])).resolves.toMatchObject({ status: 0 });
    await expect(run([join(temporaryDirectory, "valid.MMD")])).resolves.toMatchObject({ status: 0 });
    await expect(run([join(temporaryDirectory, "empty.md")])).resolves.toEqual({ status: 0, stdout: "", stderr: "" });
  });

  it("prints standalone and host-Markdown findings to stdout", async () => {
    const invalid = await run(["fixtures/compatibility/flowchart/invalid-edge.mmd"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toMatch(/invalid-edge\.mmd:\d+:\d+: error mermaid\/syntax-error:/);
    expect(invalid.stderr).toBe("");

    const embedded = await run([join(temporaryDirectory, "embedded-invalid.md")]);
    expect(embedded.status).toBe(1);
    expect(embedded.stdout).toMatch(/embedded-invalid\.md:4:\d+: error mermaid\/syntax-error:/);
    expect(embedded.stderr).toBe("");
  });

  it("emits one JSON-v2 collection for standalone and Markdown inputs", async () => {
    const invocation = await run([
      "--format", "json",
      "fixtures/compatibility/flowchart/invalid-edge.mmd",
      join(temporaryDirectory, "empty.md"),
    ]);
    expect(invocation.status).toBe(1);
    expect(invocation.stderr).toBe("");
    expect(JSON.parse(invocation.stdout)).toMatchObject({
      schemaVersion: 2,
      complete: true,
      valid: false,
      documents: [
        { languageId: "mermaid", diagramCount: 1, findings: [{ code: "mermaid/syntax-error" }] },
        { languageId: "markdown", diagramCount: 0, valid: true },
      ],
      summary: { documents: 2, diagrams: 1, findings: 1, errors: 1 },
    });
  });

  it("discovers a repository by default and includes .github while honoring ignores", async () => {
    await expect(run([], validRepository)).resolves.toEqual({ status: 0, stdout: "", stderr: "" });
    const json = await run(["--format", "json", "."], validRepository);
    expect(json.status).toBe(0);
    expect(JSON.parse(json.stdout)).toMatchObject({
      summary: { documents: 2, diagrams: 2, errors: 0 },
    });
  });

  it("uses an explicit config root and config ignores", async () => {
    const invocation = await run([
      "--format", "json", "--config", join(configRepository, "mermaid-validator.config.json"),
    ]);
    expect(invocation.status).toBe(0);
    expect(JSON.parse(invocation.stdout)).toMatchObject({ summary: { documents: 1, diagrams: 1 } });
  });

  it("lets an explicitly named file bypass hard exclusions", async () => {
    const ignored = join(validRepository, "node_modules", "bad.md");
    const invocation = await run([ignored]);
    expect(invocation.status).toBe(1);
    expect(invocation.stdout).toContain("bad.md");
  });

  it("handles version and help without discovery", async () => {
    await expect(run(["--version"])).resolves.toEqual({ status: 0, stdout: "0.1.0\n", stderr: "" });
    const help = await run(["--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: mermaid-validator [options] [paths...]");
    expect(help.stderr).toBe("");
  });

  it.each([
    [["--format", "yaml"], /must be either/],
    [["missing.mmd"], /does not exist/],
    [["package.json"], /Unsupported file extension/],
    [["--config", "missing-config.json"], /does not exist/],
  ] as const)("returns 2 for input error %j", async (args, message) => {
    const invocation = await run([...args]);
    expect(invocation.status).toBe(2);
    expect(invocation.stdout).toBe("");
    expect(invocation.stderr).toMatch(message);
  });

  it("returns 2 when discovery finds no supported files", async () => {
    const empty = join(temporaryDirectory, "empty-repository");
    await mkdir(empty);
    await writeFile(join(empty, "package.json"), "{}");
    await expect(run([], empty)).resolves.toMatchObject({ status: 2, stdout: "" });
  });

  it("preserves the shebang and package bin mapping", async () => {
    expect((await readFile(entry, "utf8")).startsWith("#!/usr/bin/env node\n")).toBe(true);
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as { bin?: Record<string, string> };
    expect(manifest.bin).toEqual({ "mermaid-validator": "./dist/cli/main.js" });
  });
});
