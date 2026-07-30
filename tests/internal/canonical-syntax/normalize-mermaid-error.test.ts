import { describe, expect, it } from "vitest";
import { normalizeMermaidError } from "../../../src/validation/canonical-syntax/normalize-mermaid-error.js";

describe("Mermaid error normalization", () => {
  it("labels a Jison parser coordinate as an approximate diagram line without its inline caret", () => {
    const outcome = normalizeMermaidError({
      message: [
        "Parse error on line 14:",
        "...history stays unchanged;<br/>damaged pairs...",
        "-----------------------^",
        "Expecting 'SOLID_OPEN_ARROW', got 'TXT'",
      ].join("\n"),
      hash: {
        line: 14,
        loc: { first_line: 15, first_column: 48 },
      },
    }, "11.16.0", "sequence");

    expect(outcome).toMatchObject({
      kind: "syntax-error",
      message: "Mermaid syntax error: Parse error near diagram line 15",
      diagramType: "sequence",
      location: { line: 15, column: 49 },
      locationPrecision: "approximate",
      engineVersion: "11.16.0",
    });
    expect(outcome.message).not.toContain("history stays");
    expect(outcome.message).not.toContain("^");
  });

  it("keeps generic messages collapsed, expected-token-free, and bounded", () => {
    const outcome = normalizeMermaidError({
      message: `  Generic\n${"x".repeat(600)} Expecting 'A', got 'B'`,
    }, "11.16.0");

    expect(outcome.message).toHaveLength("Mermaid syntax error: ".length + 500);
    expect(outcome.message).toMatch(/^Mermaid syntax error: Generic x+$/);
    expect(outcome.message).not.toContain("Expecting");
    expect(outcome.locationPrecision).toBe("document");
  });
});
