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
    })).toEqual({ documentUri: document.uri, documentVersion: 4, diagramCount: 1, valid: true, findings: [] });
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

  it("attaches conservative help to the reported Sequence Note line", () => {
    const sequenceDocument: DocumentSnapshot = {
      uri: "file:///sequence.mmd",
      languageId: "mermaid",
      text: "sequenceDiagram\nNote over B: valid;<br/>damaged\n",
    };
    const mapped = resultFromSyntaxOutcome(sequenceDocument, {
      kind: "syntax-error",
      message: "Mermaid syntax error: Parse error near diagram line 2",
      diagramType: "sequence",
      location: { line: 2, column: 21 },
      locationPrecision: "approximate",
      engineVersion: "11.16.0",
    });

    expect(mapped.findings[0]).toMatchObject({
      code: "mermaid/syntax-error",
      locationPrecision: "approximate",
      help: "In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.",
    });
  });

  it.each([
    ["initialization", "system/parser-initialization-failed"],
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

  it.each(["startup", "request"] as const)("maps a %s timeout without exposing its host-only phase", (phase) => {
    const mapped = resultFromSyntaxOutcome(document, {
      kind: "engine-failure",
      failure: "timeout",
      phase,
      message: `stable ${phase} timeout`,
      debugDetail: "/private/worker/path stack PRIVATE_MARKER",
    });
    expect(mapped.findings).toEqual([{
      code: "system/parser-timeout",
      severity: "error",
      message: `stable ${phase} timeout`,
      source: "system",
      locationPrecision: "document",
    }]);
    expect(JSON.stringify(mapped)).not.toMatch(/phase|PRIVATE_MARKER/);
  });

  it("maps restart suppression without exposing its cause", () => {
    const mapped = resultFromSyntaxOutcome(document, {
      kind: "engine-failure",
      failure: "restart-suppressed",
      cause: { kind: "startup-failure", failure: "timeout" },
      message: "Canonical Mermaid parser restart is temporarily suppressed after a startup timeout",
    });
    expect(mapped.findings).toEqual([{
      code: "system/parser-restart-suppressed",
      severity: "error",
      message: "Canonical Mermaid parser restart is temporarily suppressed after a startup timeout",
      source: "system",
      locationPrecision: "document",
    }]);
    expect(JSON.stringify(mapped)).not.toContain("cause");
  });
});
