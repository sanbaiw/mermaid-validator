import { describe, expect, it } from "vitest";
import { extractMarkdownDiagrams, projectEmbeddedSpan } from "../../../../src/validation/markdown/index.js";

function diagram() {
  const host = "> ```mermaid\r\n> flowchart TD\r\n>   😀A --> B\r\n> ```\r\n";
  const extraction = extractMarkdownDiagrams(host);
  if (extraction.kind !== "ok" || !extraction.diagrams[0]) throw new Error("fixture did not extract");
  return { host, diagram: extraction.diagrams[0] };
}

describe("embedded offset projection", () => {
  it("maps copied content and UTF-16 boundaries exactly", () => {
    const fixture = diagram();
    const emoji = fixture.diagram.source.indexOf("😀");
    const projected = projectEmbeddedSpan(fixture.diagram, { startOffset: emoji, endOffset: emoji + 2 });
    expect(projected).toBeDefined();
    expect(fixture.host.slice(projected!.startOffset, projected!.endOffset)).toBe("😀");
    expect(projectEmbeddedSpan(fixture.diagram, {
      startOffset: fixture.diagram.source.length,
      endOffset: fixture.diagram.source.length,
    })).toEqual({
      startOffset: fixture.diagram.hostBodySpan.endOffset,
      endOffset: fixture.diagram.hostBodySpan.endOffset,
    });
  });

  it("uses right-biased starts, left-biased ends, and right-biased empty joins", () => {
    const fixture = diagram();
    const join = fixture.diagram.segments[0]!.embeddedEndOffset;
    const left = fixture.diagram.segments[0]!;
    const right = fixture.diagram.segments[1]!;
    expect(projectEmbeddedSpan(fixture.diagram, { startOffset: join, endOffset: join + 1 })?.startOffset)
      .toBe(right.hostStartOffset);
    expect(projectEmbeddedSpan(fixture.diagram, { startOffset: join - 1, endOffset: join })?.endOffset)
      .toBe(left.hostEndOffset);
    expect(projectEmbeddedSpan(fixture.diagram, { startOffset: join, endOffset: join })).toEqual({
      startOffset: right.hostStartOffset,
      endOffset: right.hostStartOffset,
    });
  });

  it("rejects reversed, out-of-bounds, and inconsistent maps", () => {
    const fixture = diagram();
    expect(projectEmbeddedSpan(fixture.diagram, { startOffset: 2, endOffset: 1 })).toBeUndefined();
    expect(projectEmbeddedSpan(fixture.diagram, { startOffset: 0, endOffset: 999 })).toBeUndefined();
    expect(projectEmbeddedSpan({ ...fixture.diagram, segments: [] }, { startOffset: 0, endOffset: 1 }))
      .toBeUndefined();
  });

  it("maps an empty body to its host boundary", () => {
    const extraction = extractMarkdownDiagrams("> ```mermaid\n> ```\n");
    if (extraction.kind !== "ok" || !extraction.diagrams[0]) throw new Error("fixture did not extract");
    expect(projectEmbeddedSpan(extraction.diagrams[0], { startOffset: 0, endOffset: 0 }))
      .toEqual(extraction.diagrams[0].hostBodySpan);
  });

  it("maps implicitly closed LF and CRLF bodies through their final host boundary", () => {
    for (const lineEnding of ["\n", "\r\n"]) {
      const host = `\`\`\`mermaid${lineEnding}flowchart TD${lineEnding}`;
      const extraction = extractMarkdownDiagrams(host);
      if (extraction.kind !== "ok" || !extraction.diagrams[0]) throw new Error("fixture did not extract");
      const extracted = extraction.diagrams[0];
      expect(extracted.segments.map((segment) => (
        host.slice(segment.hostStartOffset, segment.hostEndOffset)
      )).join("")).toBe(extracted.source);
      expect(projectEmbeddedSpan(extracted, {
        startOffset: extracted.source.length,
        endOffset: extracted.source.length,
      })).toEqual({ startOffset: host.length, endOffset: host.length });
      expect(projectEmbeddedSpan(extracted, {
        startOffset: extracted.source.length - 1,
        endOffset: extracted.source.length,
      })?.endOffset).toBe(host.length);
    }

    const emptyHost = "```mermaid\n\n";
    const emptyExtraction = extractMarkdownDiagrams(emptyHost);
    if (emptyExtraction.kind !== "ok" || !emptyExtraction.diagrams[0]) {
      throw new Error("empty fixture did not extract");
    }
    expect(projectEmbeddedSpan(emptyExtraction.diagrams[0], { startOffset: 0, endOffset: 0 }))
      .toEqual({ startOffset: emptyHost.length, endOffset: emptyHost.length });
  });

  it("rejects non-integer map coordinates", () => {
    const fixture = diagram();
    const first = fixture.diagram.segments[0]!;
    expect(projectEmbeddedSpan({
      ...fixture.diagram,
      hostBodySpan: {
        ...fixture.diagram.hostBodySpan,
        startOffset: fixture.diagram.hostBodySpan.startOffset + 0.5,
      },
      segments: [{
        ...first,
        hostStartOffset: first.hostStartOffset + 0.5,
        hostEndOffset: first.hostEndOffset + 0.5,
      }, ...fixture.diagram.segments.slice(1)],
    }, { startOffset: 0, endOffset: 1 })).toBeUndefined();
  });
});
