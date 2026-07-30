import { DiagnosticSeverity } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, it } from "vitest";
import type { Finding, ValidationResult } from "../../../src/validation/index.js";
import { projectPlanEdits, projectValidationResult } from "../../../src/lsp/diagnostics.js";

function result(findings: readonly Finding[]): ValidationResult {
  return { documentUri: "untitled:test", documentVersion: 7, diagramCount: 1, valid: false, findings };
}

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    code: "example/code",
    severity: "warning",
    message: "Example",
    source: "rule",
    locationPrecision: "exact",
    ...overrides,
  };
}

describe("LSP diagnostic projection", () => {
  it("projects zero-based UTF-16 ranges across CRLF, surrogate pairs, and combining marks", () => {
    const text = "x😀e\u0301\r\nvalue";
    const document = TextDocument.create("untitled:test", "mermaid", 7, text);
    const projected = projectValidationResult(document, result([
      finding({ span: { startOffset: 3, endOffset: 5 } }),
    ]));
    expect(projected[0]?.diagnostic).toEqual({
      range: { start: { line: 0, character: 3 }, end: { line: 0, character: 5 } },
      severity: DiagnosticSeverity.Warning,
      code: "example/code",
      source: "mermaid-validator",
      message: "Example",
    });
  });

  it("maps every severity and preserves exact end-of-document positions", () => {
    const document = TextDocument.create("untitled:test", "mermaid", 7, "a\nb");
    const projected = projectValidationResult(document, result([
      finding({ severity: "error", span: { startOffset: 0, endOffset: 1 } }),
      finding({ severity: "warning", span: { startOffset: 2, endOffset: 3 } }),
      finding({ severity: "info", span: { startOffset: 3, endOffset: 3 } }),
    ]));
    expect(projected.map(({ diagnostic }) => diagnostic.severity)).toEqual([1, 2, 3]);
    expect(projected[2]?.diagnostic.range).toEqual({
      start: { line: 1, character: 1 },
      end: { line: 1, character: 1 },
    });
  });

  it("anchors locationless and impossible spans at the document origin", () => {
    const document = TextDocument.create("untitled:test", "mermaid", 7, "abc");
    const projected = projectValidationResult(document, result([
      finding({ locationPrecision: "document" }),
      finding({ span: { startOffset: -1, endOffset: 2 } }),
      finding({ span: { startOffset: 2, endOffset: 4 } }),
    ]));
    for (const { diagnostic } of projected) {
      expect(diagnostic.range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      });
    }
  });

  it("projects bounded planner edits and rejects malformed edit sets atomically", () => {
    const document = TextDocument.create("untitled:test", "mermaid", 7, "a😀bc");
    expect(projectPlanEdits(document, [
      { span: { startOffset: 1, endOffset: 3 }, newText: "x" },
      { span: { startOffset: 3, endOffset: 4 }, newText: "" },
    ])).toEqual([
      { range: { start: { line: 0, character: 1 }, end: { line: 0, character: 3 } }, newText: "x" },
      { range: { start: { line: 0, character: 3 }, end: { line: 0, character: 4 } }, newText: "" },
    ]);
    expect(projectPlanEdits(document, [
      { span: { startOffset: 2, endOffset: 2 }, newText: "x" },
    ])).toBeUndefined();
    expect(projectPlanEdits(document, [
      { span: { startOffset: 0, endOffset: 99 }, newText: "x" },
    ])).toBeUndefined();
  });
});
