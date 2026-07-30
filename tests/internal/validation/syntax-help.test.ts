import { describe, expect, it } from "vitest";
import { helpForSyntaxError } from "../../../src/validation/syntax-help.js";

const source = [
  "sequenceDiagram",
  "    Note over A: an unrelated note",
  "    Note over B: valid history stays unchanged;<br/>damaged pairs are repaired locally",
  "    A->>B: done",
].join("\r\n");

describe("syntax help", () => {
  it("recognizes the proven Sequence Note semicolon shape on the reported line", () => {
    expect(helpForSyntaxError({ source, diagramType: "sequence", line: 3 })).toBe(
      "In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.",
    );
    expect(helpForSyntaxError({
      source: "sequenceDiagram\nNOTE LEFT OF A: text;<br/>more",
      diagramType: "sequence",
      line: 2,
    })).toBeDefined();
  });

  it.each([
    { input: { source, diagramType: "flowchart", line: 3 }, label: "another diagram family" },
    { input: { source, diagramType: "sequence", line: 2 }, label: "a Note without the pattern" },
    { input: { source: "sequenceDiagram\nNote over B: text;B->>A: second", diagramType: "sequence", line: 2 }, label: "a statement separator" },
    { input: { source, diagramType: "sequence" }, label: "a missing line" },
    { input: { source, diagramType: "sequence", line: 0 }, label: "an invalid line" },
    { input: { source, diagramType: "sequence", line: 99 }, label: "an out-of-range line" },
    { input: { source, diagramType: "sequence", line: 4 }, label: "a different reported line" },
  ] as const)("returns no help for $label", ({ input }) => {
    expect(helpForSyntaxError(input)).toBeUndefined();
  });
});
