import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverInputFiles } from "../../../src/cli/discovery.js";

const roots: string[] = [];
async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "mermaid-validator-discovery-"));
  roots.push(path);
  return path;
}
async function file(path: string, content = "flowchart TD\n  A-->B\n"): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (path) => await rm(path, { recursive: true, force: true })));
});

describe("input discovery", () => {
  it("discovers supported files, dot directories, nested gitignore, config ignores, and hard exclusions", async () => {
    const directory = await root();
    await file(join(directory, "guide.md"), "# Guide\n");
    await file(join(directory, ".github", "diagram.MMD"));
    await file(join(directory, "ignored", "draft.md"));
    await file(join(directory, "nested", "skip.mermaid"));
    await file(join(directory, "nested", "keep.mermaid"));
    await file(join(directory, "node_modules", "dependency.md"));
    await file(join(directory, "dist", "generated.md"));
    await file(join(directory, ".git", "internal.md"));
    await writeFile(join(directory, "nested", ".gitignore"), "skip.mermaid\n");
    await expect(discoverInputFiles({
      cwd: directory,
      configRoot: directory,
      explicitPaths: [],
      ignore: ["ignored/**"],
    })).resolves.toEqual([
      join(directory, ".github", "diagram.MMD"),
      join(directory, "guide.md"),
      join(directory, "nested", "keep.mermaid"),
    ]);
  });

  it("lets explicit files bypass every ignore", async () => {
    const directory = await root();
    const ignored = join(directory, "node_modules", "named.md");
    await file(ignored, "# Named\n");
    await expect(discoverInputFiles({
      cwd: directory,
      configRoot: directory,
      explicitPaths: [ignored],
      ignore: ["node_modules/**"],
    })).resolves.toEqual([ignored]);
  });

  it("allows an outside-root explicit directory without applying root ignores", async () => {
    const configRoot = await root();
    const outside = await root();
    await file(join(outside, "draft.md"), "# Draft\n");
    await expect(discoverInputFiles({
      cwd: configRoot,
      configRoot,
      explicitPaths: [outside],
      ignore: ["draft.md"],
    })).resolves.toEqual([join(outside, "draft.md")]);
  });

  it("sorts and deduplicates explicit inputs", async () => {
    const directory = await root();
    await file(join(directory, "b.md"), "# B\n");
    await file(join(directory, "a.mmd"));
    await expect(discoverInputFiles({
      cwd: directory,
      configRoot: directory,
      explicitPaths: [directory, "a.mmd"],
    })).resolves.toEqual([join(directory, "a.mmd"), join(directory, "b.md")]);
  });

  it("rejects missing, unsupported, and empty discovery", async () => {
    const directory = await root();
    await file(join(directory, "package.json"), "{}");
    await expect(discoverInputFiles({
      cwd: directory, configRoot: directory, explicitPaths: ["missing.md"],
    })).rejects.toThrow(/does not exist/);
    await expect(discoverInputFiles({
      cwd: directory, configRoot: directory, explicitPaths: ["package.json"],
    })).rejects.toThrow(/Unsupported file extension/);
    await expect(discoverInputFiles({
      cwd: directory, configRoot: directory, explicitPaths: [],
    })).rejects.toThrow(/No supported input files/);
  });
});
