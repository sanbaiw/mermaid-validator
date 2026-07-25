import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadCliConfig, rulesForPath } from "../../../src/cli/config.js";

const roots: string[] = [];
async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "mermaid-validator-config-"));
  roots.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (path) => await rm(path, { recursive: true, force: true })));
});

describe("CLI config", () => {
  it("finds the nearest fixed-name config upward", async () => {
    const directory = await root();
    const nested = join(directory, "docs", "guide");
    await mkdir(nested, { recursive: true });
    await writeFile(join(directory, "mermaid-validator.config.json"), JSON.stringify({ ignore: ["drafts/**"] }));
    await expect(loadCliConfig({ cwd: nested })).resolves.toEqual({
      rootDirectory: directory,
      filepath: join(directory, "mermaid-validator.config.json"),
      config: { ignore: ["drafts/**"] },
    });
  });

  it("loads an exact explicit override and defaults to cwd without config", async () => {
    const directory = await root();
    await writeFile(join(directory, "custom.json"), "{}");
    await expect(loadCliConfig({ cwd: directory, explicitPath: "custom.json" })).resolves.toMatchObject({
      rootDirectory: directory,
      config: {},
    });
    await expect(loadCliConfig({ cwd: join(directory, "absent") })).resolves.toMatchObject({
      rootDirectory: join(directory, "absent"),
      config: {},
    });
  });

  it.each([
    [{ files: ["**/*.md"] }, /Unknown config field/],
    [{ ignore: "drafts/**" }, /Invalid ignore pattern/],
    [{ ignore: ["!draft.md"] }, /Invalid ignore pattern/],
    [{ ignore: ["../outside/**"] }, /Invalid ignore pattern/],
    [{ ignore: ["/absolute/**"] }, /Invalid ignore pattern/],
    [{ ignore: ["docs\\draft.md"] }, /Invalid ignore pattern/],
    [{ ignore: ["docs/{a,b}.md"] }, /Invalid ignore pattern/],
    [{ ignore: ["docs/[ab].md"] }, /Invalid ignore pattern/],
    [{ ignore: ["docs/@(a).md"] }, /Invalid ignore pattern/],
  ])("rejects invalid config %j", async (value, message) => {
    const directory = await root();
    await writeFile(join(directory, "config.json"), JSON.stringify(value));
    await expect(loadCliConfig({ cwd: directory, explicitPath: "config.json" })).rejects.toThrow(message);
  });

  it("bounds parse and missing-file failures", async () => {
    const directory = await root();
    await writeFile(join(directory, "bad.json"), "{");
    await expect(loadCliConfig({ cwd: directory, explicitPath: "bad.json" })).rejects.toThrow(/Invalid JSON/);
    await expect(loadCliConfig({ cwd: directory, explicitPath: "missing.json" })).rejects.toThrow(/does not exist/);
  });

  it("layers sparse base rules and every matching override in declaration order", async () => {
    const directory = await root();
    await writeFile(join(directory, "config.json"), JSON.stringify({
      rules: { "flowchart/no-markdown-heading-in-label": "warning" },
      overrides: [
        { files: ["docs/**"], rules: { "flowchart/no-markdown-heading-in-label": "error" } },
        { files: ["docs/drafts/?*.md"], rules: { "flowchart/no-markdown-heading-in-label": "off" } },
      ],
    }));
    const loaded = await loadCliConfig({ cwd: directory, explicitPath: "config.json" });
    expect(rulesForPath(loaded, join(directory, "docs", "guide.md")))
      .toMatchObject({ "flowchart/no-markdown-heading-in-label": { severity: "error" } });
    expect(rulesForPath(loaded, join(directory, "docs\\guide.md")))
      .toMatchObject({ "flowchart/no-markdown-heading-in-label": { severity: "error" } });
    expect(rulesForPath(loaded, join(directory, "docs", "drafts", "a.md")))
      .toMatchObject({ "flowchart/no-markdown-heading-in-label": { severity: "off" } });
    expect(rulesForPath(loaded, join(directory, "other.md")))
      .toMatchObject({ "flowchart/no-markdown-heading-in-label": { severity: "warning" } });
    expect(rulesForPath(loaded, join(directory, "..", "outside.md")))
      .toMatchObject({ "flowchart/no-markdown-heading-in-label": { severity: "warning" } });
  });

  it.each([
    [{ rules: { "unknown/rule": "warning" } }, /Unknown rule/],
    [{ rules: { "flowchart/no-markdown-heading-in-label": "warn" } }, /Invalid setting/],
    [{ rules: { "flowchart/no-markdown-heading-in-label": ["warning"] } }, /Invalid setting/],
    [{ rules: { "flowchart/no-markdown-heading-in-label": ["warning", { extra: true }] } }, /Invalid options/],
    [{ overrides: [{ files: [], rules: { "flowchart/no-markdown-heading-in-label": "error" } }] }, /Invalid override/],
    [{ overrides: [{ files: ["../outside/**"], rules: { "flowchart/no-markdown-heading-in-label": "error" } }] }, /Invalid override/],
    [{ overrides: [{ files: ["docs/**"], rules: {} }] }, /Invalid override/],
    [{ overrides: [{ files: ["docs/**"], rules: { "flowchart/no-markdown-heading-in-label": "error" }, extra: true }] }, /Invalid override/],
  ])("rejects invalid Stage 3 config %j", async (value, message) => {
    const directory = await root();
    await writeFile(join(directory, "config.json"), JSON.stringify(value));
    await expect(loadCliConfig({ cwd: directory, explicitPath: "config.json" })).rejects.toThrow(message);
  });
});
