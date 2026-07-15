import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { validateDocument, type DocumentSnapshot } from "../../../src/validation/index.js";

const families = ["flowchart", "sequence", "pie", "class", "state"] as const;

async function snapshot(path: string): Promise<DocumentSnapshot> {
  const absolute = resolve(path);
  return {
    uri: pathToFileURL(absolute).href,
    languageId: "mermaid",
    text: await readFile(absolute, "utf8"),
  };
}

async function corpusPaths(): Promise<string[]> {
  const paths: string[] = [];
  for (const family of families) {
    for (const file of await readdir(resolve("fixtures/compatibility", family))) {
      if (file.endsWith(".mmd")) paths.push(`fixtures/compatibility/${family}/${file}`);
    }
  }
  return paths.sort();
}

describe("validateDocument contract", () => {
  it("accepts every valid fixture in all five target families", async () => {
    for (const path of (await corpusPaths()).filter((item) => basename(item).startsWith("valid-"))) {
      await expect(validateDocument(await snapshot(path))).resolves.toMatchObject({ valid: true, findings: [] });
    }
  }, 20_000);

  it("returns a stable syntax finding for every invalid target fixture", async () => {
    for (const path of (await corpusPaths()).filter((item) => basename(item).startsWith("invalid-"))) {
      const result = await validateDocument(await snapshot(path));
      expect(result.valid, path).toBe(false);
      expect(result.findings, path).toHaveLength(1);
      expect(result.findings[0], path).toMatchObject({
        code: "mermaid/syntax-error",
        severity: "error",
        source: "mermaid",
        engine: { name: "mermaid", version: "11.16.0" },
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toMatch(/hash|stack|JSDOM|worker-entry|Expecting/);
    }
  }, 20_000);

  it("distinguishes an officially valid unsupported family", async () => {
    const result = await validateDocument(await snapshot("tests/fixtures/cli/unsupported-gantt.mmd"));
    expect(result).toMatchObject({
      valid: false,
      findings: [{
        code: "mermaid/unsupported-diagram-type",
        diagramType: "gantt",
        locationPrecision: "document",
        engine: { name: "mermaid", version: "11.16.0" },
      }],
    });
  });
});
