import { describe, expect, it } from "vitest";
import type { DocumentSnapshot, ValidationResult } from "../../../src/validation/index.js";
import type { ValidatedDocument } from "../../../src/cli/contracts.js";
import { formatJsonV2 } from "../../../src/cli/json-v2-output.js";
import { formatTerminal } from "../../../src/cli/terminal-output.js";

const document: DocumentSnapshot = {
  uri: "file:///tmp/diagram.mmd",
  languageId: "mermaid",
  text: "flowchart TD\r\n  😀A -- B\r\n",
};
const base: ValidationResult = {
  documentUri: document.uri,
  diagramCount: 1,
  valid: false,
  findings: [{
    code: "mermaid/syntax-error",
    severity: "error",
    message: "Mermaid syntax error: bad edge",
    source: "mermaid",
    span: { startOffset: 16, endOffset: 17 },
    locationPrecision: "approximate",
    diagramType: "flowchart",
    engine: { name: "mermaid", version: "11.16.0" },
  }],
};

describe("terminal reporter", () => {
  it("renders approximate line and column from a UTF-16 offset", () => {
    expect(formatTerminal(base, document.text)).toBe(
      "/tmp/diagram.mmd:2:3: error mermaid/syntax-error: Mermaid syntax error: bad edge\n",
    );
  });

  it("omits coordinates for a document-only finding", () => {
    expect(formatTerminal({
      ...base,
      findings: [{
        code: "mermaid/syntax-error",
        severity: "error",
        message: "Mermaid syntax error: bad edge",
        source: "mermaid",
        locationPrecision: "document",
      }],
    }, "source")).toBe(
      "/tmp/diagram.mmd: error mermaid/syntax-error: Mermaid syntax error: bad edge\n",
    );
  });

  it("renders nothing for a result without findings", () => {
    expect(formatTerminal({ ...base, valid: true, findings: [] }, "flowchart TD")).toBe("");
  });
});

describe("JSON-v2 reporter", () => {
  it("emits deterministic collection fields, summaries, and omitted optional fields", () => {
    const records: ValidatedDocument[] = [{ document, result: base }];
    const output = formatJsonV2(records, [], "0.1.0");
    expect(output.endsWith("\n")).toBe(true);
    expect(formatJsonV2(records, [], "0.1.0")).toBe(output);
    expect(JSON.parse(output)).toMatchObject({
      schemaVersion: 2,
      tool: { name: "mermaid-diagram-validator", version: "0.1.0" },
      complete: true,
      valid: false,
      inputErrors: [],
      documents: [{
        uri: document.uri,
        languageId: "mermaid",
        diagramCount: 1,
        findings: [{ code: "mermaid/syntax-error", locationPrecision: "approximate" }],
      }],
      summary: {
        documents: 1, diagrams: 1, findings: 1, errors: 1, warnings: 0, infos: 0, inputErrors: 0,
      },
    });
    expect(output).not.toMatch(/documentVersion|help|null|hash|stack|debugDetail/);
  });

  it("marks partial collections incomplete and sorts bounded read errors", () => {
    const output = JSON.parse(formatJsonV2([], [
      { code: "input/read-failed", path: "/z.md", message: "Unable to read input file" },
      { code: "input/read-failed", path: "/a.md", message: "Unable to read input file" },
    ], "0.1.0"));
    expect(output).toMatchObject({
      complete: false,
      valid: false,
      inputErrors: [{ path: "/a.md" }, { path: "/z.md" }],
      summary: { inputErrors: 2 },
    });
  });
});
