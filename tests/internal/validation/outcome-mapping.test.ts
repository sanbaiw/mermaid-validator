import { describe, expect, it } from "vitest";
import type { DocumentSnapshot } from "../../../src/validation/document.js";
import type { SyntaxOutcome } from "../../../src/validation/canonical-syntax/protocol.js";
import { resultFromSyntaxOutcome } from "../../../src/validation/validate-document.js";

const document: DocumentSnapshot = {
  uri: "file:///diagram.mmd",
  languageId: "mermaid",
  text: "flowchart TD\n  A -- B\n",
  version: 4,
};

describe("syntax outcome mapping", () => {
  it("derives valid from the absence of error findings", () => {
    expect(resultFromSyntaxOutcome(document, {
      kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0",
    })).toEqual({ documentUri: document.uri, documentVersion: 4, valid: true, findings: [] });
  });

  it("maps syntax and unsupported outcomes to stable Mermaid findings", () => {
    const syntax = resultFromSyntaxOutcome(document, {
      kind: "syntax-error",
      message: "Mermaid syntax error: bad edge",
      diagramType: "flowchart",
      location: { line: 2, column: 4 },
      locationPrecision: "approximate",
      engineVersion: "11.16.0",
    });
    expect(syntax.valid).toBe(false);
    expect(syntax.findings[0]).toMatchObject({
      code: "mermaid/syntax-error",
      source: "mermaid",
      span: { startOffset: 16, endOffset: 17 },
      engine: { name: "mermaid", version: "11.16.0" },
    });

    expect(resultFromSyntaxOutcome(document, {
      kind: "unsupported-type",
      diagramType: "gantt",
      message: "Mermaid diagram type \"gantt\" is not supported",
      engineVersion: "11.16.0",
    }).findings[0]).toMatchObject({
      code: "mermaid/unsupported-diagram-type",
      locationPrecision: "document",
      diagramType: "gantt",
    });
  });

  it.each([
    ["initialization", "system/parser-initialization-failed"],
    ["timeout", "system/parser-timeout"],
    ["runtime", "system/parser-runtime-failed"],
    ["crash", "system/parser-crashed"],
    ["protocol", "system/parser-protocol-error"],
  ] as const)("maps %s infrastructure failure and discards debug detail", (failure, code) => {
    const outcome: SyntaxOutcome = {
      kind: "engine-failure",
      failure,
      message: `stable ${failure}`,
      debugDetail: "/private/worker/path stack PRIVATE_MARKER",
    };
    const mapped = resultFromSyntaxOutcome(document, outcome);
    expect(mapped.valid).toBe(false);
    expect(mapped.findings).toEqual([{
      code,
      severity: "error",
      message: `stable ${failure}`,
      source: "system",
      locationPrecision: "document",
    }]);
    expect(JSON.stringify(mapped)).not.toContain("PRIVATE_MARKER");
  });
});
