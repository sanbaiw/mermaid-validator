import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { validateDocument, type DocumentSnapshot } from "../../../src/validation/index.js";

const families = ["flowchart", "sequence", "pie", "class", "state"] as const;
const representativeInvalid = {
  flowchart: "invalid-edge.mmd",
  sequence: "invalid-message.mmd",
  pie: "invalid-section.mmd",
  class: "invalid-relation.mmd",
  state: "invalid-transition.mmd",
} as const;

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
      await expect(validateDocument(await snapshot(path))).resolves.toMatchObject({
        diagramCount: 1, valid: true, findings: [],
      });
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
      diagramCount: 1,
      findings: [{
        code: "mermaid/unsupported-diagram-type",
        diagramType: "gantt",
        locationPrecision: "document",
        engine: { name: "mermaid", version: "11.16.0" },
      }],
    });
  });

  it("preserves canonical verdicts when all five families are embedded", async () => {
    for (const family of families) {
      const validPath = `fixtures/compatibility/${family}/valid-minimal.mmd`;
      const invalidPath = `fixtures/compatibility/${family}/${representativeInvalid[family]}`;
      for (const path of [validPath, invalidPath]) {
        const standalone = await snapshot(path);
        const standaloneResult = await validateDocument(standalone);
        const markdownText = `> \`\`\`mermaid\n> ${standalone.text.replaceAll("\n", "\n> ")}\`\`\`\n`;
        const embeddedResult = await validateDocument({
          uri: "file:///guide.md",
          languageId: "markdown",
          text: markdownText,
        });
        expect(embeddedResult.valid, path).toBe(standaloneResult.valid);
        expect(embeddedResult.diagramCount, path).toBe(1);
        expect(embeddedResult.findings.map(({ code, source, severity, diagramType, engine }) => ({
          code, source, severity, diagramType, engine,
        })), path).toEqual(standaloneResult.findings.map(({ code, source, severity, diagramType, engine }) => ({
          code, source, severity, diagramType, engine,
        })));
        for (const finding of embeddedResult.findings) {
          expect(finding.span, path).toBeDefined();
          expect(finding.span!.startOffset, path).toBeGreaterThanOrEqual(0);
          expect(finding.span!.endOffset, path).toBeLessThanOrEqual(markdownText.length);
        }
      }
    }
  }, 20_000);

  it("validates multiple Markdown blocks in order and accepts zero-block Markdown", async () => {
    await expect(validateDocument({
      uri: "file:///empty.md", languageId: "markdown", text: "# Guide\n",
    })).resolves.toEqual({
      documentUri: "file:///empty.md", diagramCount: 0, valid: true, findings: [],
    });
    const text = [
      "```mermaid", "flowchart TD", "  A -- B", "```",
      "```mermaid", "gantt", "  title Roadmap", "```",
    ].join("\n");
    const result = await validateDocument({
      uri: "file:///multiple.md", languageId: "markdown", text, version: 7,
    });
    expect(result).toMatchObject({
      documentUri: "file:///multiple.md",
      documentVersion: 7,
      diagramCount: 2,
      valid: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "mermaid/syntax-error", "mermaid/unsupported-diagram-type",
    ]);
    for (const finding of result.findings) expect(finding.span).toBeDefined();
  });

  it("maps a locationless embedded failure to only its block body", async () => {
    const text = "intro\n> ```mermaid\n> pie\n>   title Broken\n>   \"A\": nope\n> ```\noutro\n";
    const result = await validateDocument({ uri: "file:///pie.md", languageId: "markdown", text });
    expect(result.valid).toBe(false);
    expect(result.findings[0]).toMatchObject({ locationPrecision: "approximate" });
    const span = result.findings[0]!.span!;
    expect(text.slice(span.startOffset, span.endOffset)).toContain("pie");
    expect(text.slice(span.startOffset, span.endOffset)).not.toContain("intro");
    expect(text.slice(span.startOffset, span.endOffset)).not.toContain("```");
  });

  it("propagates cancellation as AbortError", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(validateDocument({
      uri: "file:///cancelled.md", languageId: "markdown", text: "```mermaid\nflowchart TD\n```",
    }, { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });
});
