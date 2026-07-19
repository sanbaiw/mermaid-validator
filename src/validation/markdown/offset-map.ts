import type { EmbeddedSpan, ExtractedDiagram, HostSpan } from "./contracts.js";

function hasValidMap(diagram: ExtractedDiagram): boolean {
  const { segments, source, hostBodySpan } = diagram;
  if (!Number.isSafeInteger(hostBodySpan.startOffset)
    || !Number.isSafeInteger(hostBodySpan.endOffset)
    || hostBodySpan.startOffset < 0
    || hostBodySpan.endOffset < hostBodySpan.startOffset) return false;
  if (source.length === 0) {
    return segments.length === 0 && hostBodySpan.startOffset === hostBodySpan.endOffset;
  }
  if (segments.length === 0) return false;
  let embeddedOffset = 0;
  let previousHostEnd = -1;
  for (const segment of segments) {
    const embeddedLength = segment.embeddedEndOffset - segment.embeddedStartOffset;
    const hostLength = segment.hostEndOffset - segment.hostStartOffset;
    if (!Number.isSafeInteger(segment.embeddedStartOffset)
      || !Number.isSafeInteger(segment.embeddedEndOffset)
      || !Number.isSafeInteger(segment.hostStartOffset)
      || !Number.isSafeInteger(segment.hostEndOffset)
      || segment.embeddedStartOffset !== embeddedOffset
      || embeddedLength <= 0
      || embeddedLength !== hostLength
      || segment.hostStartOffset < 0
      || segment.hostStartOffset < previousHostEnd
      || segment.hostEndOffset > hostBodySpan.endOffset) return false;
    embeddedOffset = segment.embeddedEndOffset;
    previousHostEnd = segment.hostEndOffset;
  }
  return embeddedOffset === source.length
    && hostBodySpan.startOffset === segments[0]!.hostStartOffset
    && hostBodySpan.endOffset >= segments.at(-1)!.hostEndOffset;
}

function projectStart(diagram: ExtractedDiagram, offset: number): number | undefined {
  if (offset === diagram.source.length) return diagram.hostBodySpan.endOffset;
  const segment = diagram.segments.find((candidate) => (
    offset >= candidate.embeddedStartOffset && offset < candidate.embeddedEndOffset
  ));
  return segment === undefined
    ? undefined
    : segment.hostStartOffset + offset - segment.embeddedStartOffset;
}

function projectEnd(diagram: ExtractedDiagram, offset: number): number | undefined {
  if (offset === diagram.source.length) return diagram.hostBodySpan.endOffset;
  if (offset === 0) return diagram.segments[0]?.hostStartOffset;
  const segment = diagram.segments.findLast((candidate) => (
    offset > candidate.embeddedStartOffset && offset <= candidate.embeddedEndOffset
  ));
  return segment === undefined
    ? undefined
    : segment.hostStartOffset + offset - segment.embeddedStartOffset;
}

export function projectEmbeddedSpan(
  diagram: ExtractedDiagram,
  embeddedSpan: EmbeddedSpan,
): HostSpan | undefined {
  const { startOffset, endOffset } = embeddedSpan;
  if (!Number.isSafeInteger(startOffset)
    || !Number.isSafeInteger(endOffset)
    || startOffset < 0
    || endOffset < startOffset
    || endOffset > diagram.source.length
    || !hasValidMap(diagram)) return undefined;

  if (diagram.source.length === 0) {
    return startOffset === 0 && endOffset === 0 ? diagram.hostBodySpan : undefined;
  }
  if (startOffset === endOffset) {
    const boundary = projectStart(diagram, startOffset);
    return boundary === undefined ? undefined : { startOffset: boundary, endOffset: boundary };
  }
  const hostStart = projectStart(diagram, startOffset);
  const hostEnd = projectEnd(diagram, endOffset);
  if (hostStart === undefined || hostEnd === undefined || hostEnd < hostStart) return undefined;
  return { startOffset: hostStart, endOffset: hostEnd };
}
