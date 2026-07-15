import { describe, expect, it } from "vitest";
import type { ValidationResult } from "../../../src/validation/index.js";
import { formatJsonV1 } from "../../../src/cli/json-v1-output.js";
import { formatTerminal } from "../../../src/cli/terminal-output.js";

const base: ValidationResult = {
  documentUri: "file:///tmp/diagram.mmd",
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
    expect(formatTerminal(base, "flowchart TD\r\n  😀A -- B\r\n")).toBe(
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

describe("JSON-v1 reporter", () => {
  it("emits deterministic required fields and omits absent optional fields", () => {
    const output = formatJsonV1(base, "0.1.0");
    expect(output.endsWith("\n")).toBe(true);
    expect(formatJsonV1(base, "0.1.0")).toBe(output);
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      schemaVersion: 1,
      tool: { name: "mermaid-diagram-validator", version: "0.1.0" },
      document: { uri: base.documentUri },
      valid: false,
      findings: [{ code: "mermaid/syntax-error", locationPrecision: "approximate" }],
    });
    expect(output).not.toMatch(/documentVersion|help|null|hash|stack|debugDetail/);
  });
});
