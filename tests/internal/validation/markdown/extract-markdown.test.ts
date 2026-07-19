import { describe, expect, it } from "vitest";
import { extractMarkdownDiagrams } from "../../../../src/validation/markdown/index.js";

function extract(source: string) {
  const result = extractMarkdownDiagrams(source);
  expect(result.kind).toBe("ok");
  if (result.kind !== "ok") throw new Error(result.message);
  for (const diagram of result.diagrams) {
    expect(diagram.segments.map((segment) => (
      source.slice(segment.hostStartOffset, segment.hostEndOffset)
    )).join("")).toBe(diagram.source);
  }
  return result.diagrams;
}

describe("Markdown extraction", () => {
  it("extracts lowercase backtick and tilde fences with metadata in order", () => {
    const source = [
      "before",
      "```mermaid title=one",
      "flowchart TD",
      "  A-->B",
      "```",
      "~~~mermaid",
      "sequenceDiagram",
      "  A->>B: hi",
      "~~~~",
    ].join("\n");
    expect(extract(source).map((diagram) => diagram.source)).toEqual([
      "flowchart TD\n  A-->B",
      "sequenceDiagram\n  A->>B: hi",
    ]);
  });

  it("ignores different casing, other languages, and indented code", () => {
    const source = [
      "```Mermaid", "flowchart TD", "```",
      "```MERMAID", "flowchart TD", "```",
      "```js", "flowchart TD", "```",
      "    ```mermaid", "    flowchart TD", "    ```",
    ].join("\n");
    expect(extract(source)).toEqual([]);
  });

  it("round-trips list, nested blockquote, CRLF, and Unicode content", () => {
    const source = [
      "- > ```mermaid\r\n",
      "  > flowchart TD\r\n",
      "  >   😀é --> B\r\n",
      "  > ```\r\n",
    ].join("");
    expect(extract(source)[0]?.source).toBe("flowchart TD\r\n  😀é --> B");
  });

  it("handles frontmatter followed by a block, an empty block, and EOF-closed fences", () => {
    const source = "---\ntitle: Guide\n---\n```mermaid\n```\n~~~mermaid\nflowchart TD\n  A-->B";
    expect(extract(source).map((diagram) => diagram.source)).toEqual([
      "",
      "flowchart TD\n  A-->B",
    ]);
  });

  it("keeps the parser's final host boundary for implicitly closed fences", () => {
    for (const lineEnding of ["\n", "\r\n"]) {
      const source = `\`\`\`mermaid${lineEnding}flowchart TD${lineEnding}`;
      const diagram = extract(source)[0]!;
      expect(diagram.source).toBe("flowchart TD");
      expect(diagram.hostBodySpan.endOffset).toBe(source.length);
    }

    const closed = "```mermaid\nflowchart TD\n```";
    const diagram = extract(closed)[0]!;
    expect(diagram.hostBodySpan.endOffset).toBe(closed.indexOf("\n```", 11));
    expect(diagram.hostBodySpan.endOffset).toBeLessThan(closed.length);

    const empty = "```mermaid\n\n";
    expect(extract(empty)[0]).toMatchObject({
      source: "",
      hostBodySpan: { startOffset: empty.length, endOffset: empty.length },
    });

    const container = "> ```mermaid\n> flowchart TD\noutside\n";
    expect(extract(container)[0]?.hostBodySpan.endOffset).toBe(container.indexOf("\noutside"));

    const emptyContainer = "> ```mermaid\noutside\n";
    expect(extract(emptyContainer)[0]).toMatchObject({
      source: "",
      hostBodySpan: { startOffset: 12, endOffset: 12 },
    });
  });

  it("returns no diagrams for ordinary Markdown", () => {
    expect(extract("# Guide\n\nNo diagrams.\n")).toEqual([]);
  });
});
