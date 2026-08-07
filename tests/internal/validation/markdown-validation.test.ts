import { describe, expect, it } from "vitest";
import { extractMarkdownDiagrams, projectEmbeddedSpan } from "../../../src/validation/markdown/index.js";
import type { SyntaxOutcome } from "../../../src/validation/canonical-syntax/protocol.js";
import {
  validateDocumentWithDependencies,
  type ValidationDependencies,
} from "../../../src/validation/validate-document.js";

const twoBlocks = [
  "```mermaid", "flowchart TD", "  A-->B", "```",
  "```mermaid", "sequenceDiagram", "  A->>B: hi", "```",
].join("\n");

function dependencies(checkSyntax: ValidationDependencies["checkSyntax"]): ValidationDependencies {
  return { checkSyntax, extractMarkdown: extractMarkdownDiagrams, projectSpan: projectEmbeddedSpan };
}

function markdown(text = twoBlocks) {
  return { uri: "file:///guide.md", languageId: "markdown" as const, text };
}

describe("Markdown validation orchestration", () => {
  it("records a block-local system outcome and continues later blocks", async () => {
    let calls = 0;
    const result = await validateDocumentWithDependencies(markdown(), {}, dependencies(async () => {
      calls += 1;
      return calls === 1
        ? { kind: "engine-failure", failure: "timeout", phase: "request", message: "timeout" }
        : { kind: "accepted", diagramType: "sequence", engineVersion: "11.16.0" };
    }));
    expect(calls).toBe(2);
    expect(result).toMatchObject({ diagramCount: 2, valid: false });
    expect(result.findings).toEqual([expect.objectContaining({
      code: "system/parser-timeout", locationPrecision: "approximate",
    })]);
    expect(result.findings[0]?.span).toBeDefined();
  });

  it("attempts every block during repeated system failures", async () => {
    let calls = 0;
    const result = await validateDocumentWithDependencies(markdown(), {}, dependencies(async () => {
      calls += 1;
      return { kind: "engine-failure", failure: "runtime", message: "runtime" };
    }));
    expect(calls).toBe(2);
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "system/parser-runtime-failed", "system/parser-runtime-failed",
    ]);
  });

  it("turns extraction failure into one atomic document result without canonical calls", async () => {
    let calls = 0;
    const result = await validateDocumentWithDependencies(markdown(), {}, {
      ...dependencies(async () => { calls += 1; return { kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0" }; }),
      extractMarkdown: () => ({ kind: "failure", message: "bounded extraction failure" }),
    });
    expect(calls).toBe(0);
    expect(result).toEqual({
      documentUri: "file:///guide.md",
      diagramCount: 0,
      valid: false,
      findings: [{
        code: "system/markdown-extraction-failed",
        severity: "error",
        message: "bounded extraction failure",
        source: "system",
        span: { startOffset: 0, endOffset: twoBlocks.length },
        locationPrecision: "document",
      }],
    });
  });

  it("prevalidates every map before making canonical requests", async () => {
    let calls = 0;
    const result = await validateDocumentWithDependencies(markdown(), {}, {
      ...dependencies(async () => { calls += 1; return { kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0" }; }),
      projectSpan: () => undefined,
    });
    expect(calls).toBe(0);
    expect(result.findings).toEqual([expect.objectContaining({ code: "system/markdown-extraction-failed" })]);
  });

  it("rejects host-out-of-bounds maps before making canonical requests", async () => {
    let calls = 0;
    const result = await validateDocumentWithDependencies(markdown("x"), {}, {
      ...dependencies(async () => {
        calls += 1;
        return { kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0" };
      }),
      extractMarkdown: () => ({
        kind: "ok",
        diagrams: [{
          source: "x",
          segments: [{
            embeddedStartOffset: 0,
            embeddedEndOffset: 1,
            hostStartOffset: 100,
            hostEndOffset: 101,
          }],
          hostBodySpan: { startOffset: 100, endOffset: 101 },
        }],
      }),
    });
    expect(calls).toBe(0);
    expect(result).toMatchObject({ diagramCount: 0, valid: false });
    expect(result.findings).toEqual([expect.objectContaining({
      code: "system/markdown-extraction-failed",
      span: { startOffset: 0, endOffset: 1 },
    })]);
  });

  it("discards earlier findings and stops later blocks when outcome projection fails", async () => {
    const threeBlocks = `${twoBlocks}\n\`\`\`mermaid\nstateDiagram-v2\n  [*] --> Ready\n\`\`\``;
    let calls = 0;
    const outcomes: SyntaxOutcome[] = [
      {
        kind: "syntax-error", message: "first", location: { line: 1, column: 1 },
        locationPrecision: "approximate", engineVersion: "11.16.0",
      },
      {
        kind: "syntax-error", message: "second", location: { line: 1, column: 2 },
        locationPrecision: "approximate", engineVersion: "11.16.0",
      },
    ];
    const result = await validateDocumentWithDependencies(markdown(threeBlocks), {}, {
      ...dependencies(async () => outcomes[calls++]!),
      projectSpan: (diagram, span) => calls === 2 && span.startOffset === 1
        ? undefined
        : projectEmbeddedSpan(diagram, span),
    });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ diagramCount: 0, valid: false });
    expect(result.findings).toEqual([expect.objectContaining({ code: "system/markdown-extraction-failed" })]);
  });

  it("treats an out-of-host outcome projection as an atomic mapping failure", async () => {
    const threeBlocks = `${twoBlocks}\n\`\`\`mermaid\nstateDiagram-v2\n  [*] --> Ready\n\`\`\``;
    let calls = 0;
    const outcome: SyntaxOutcome = {
      kind: "syntax-error",
      message: "bad",
      location: { line: 1, column: 2 },
      locationPrecision: "approximate",
      engineVersion: "11.16.0",
    };
    const document = markdown(threeBlocks);
    const result = await validateDocumentWithDependencies(document, {}, {
      ...dependencies(async () => { calls += 1; return outcome; }),
      projectSpan: (diagram, span) => calls === 2 && span.startOffset === 1
        ? { startOffset: -1, endOffset: document.text.length + 1 }
        : projectEmbeddedSpan(diagram, span),
    });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ diagramCount: 0, valid: false });
    expect(result.findings).toEqual([expect.objectContaining({
      code: "system/markdown-extraction-failed",
      span: { startOffset: 0, endOffset: document.text.length },
    })]);
  });
});
