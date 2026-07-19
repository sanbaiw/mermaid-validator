import type { EmbeddedSpan, ExtractedDiagram, HostSpan } from "./contracts.js";

export function projectEmbeddedSpan(
  diagram: ExtractedDiagram,
  embeddedSpan: EmbeddedSpan,
): HostSpan | undefined {
  const { startOffset, endOffset } = embeddedSpan;
  if (!Number.isSafeInteger(startOffset)
    || !Number.isSafeInteger(endOffset)
    || startOffset < 0
    || endOffset < startOffset
    || endOffset > diagram.source.length) return undefined;

  const { segments, source, hostBodySpan } = diagram;
  if (!Number.isSafeInteger(hostBodySpan.startOffset)
    || !Number.isSafeInteger(hostBodySpan.endOffset)
    || hostBodySpan.startOffset < 0
    || hostBodySpan.endOffset < hostBodySpan.startOffset) return undefined;

  if (source.length === 0) {
    return segments.length === 0
      && hostBodySpan.startOffset === hostBodySpan.endOffset
      && startOffset === 0
      && endOffset === 0
      ? hostBodySpan
      : undefined;
  }
  if (segments.length === 0) return undefined;

  let embeddedOffset = 0;
  let previousHostEnd = -1;
  let hostStart: number | undefined;
  let hostEnd: number | undefined;
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
      || segment.hostEndOffset > hostBodySpan.endOffset) return undefined;

    if (startOffset >= segment.embeddedStartOffset && startOffset < segment.embeddedEndOffset) {
      hostStart = segment.hostStartOffset + startOffset - segment.embeddedStartOffset;
    }
    if (endOffset > segment.embeddedStartOffset && endOffset <= segment.embeddedEndOffset) {
      hostEnd = segment.hostStartOffset + endOffset - segment.embeddedStartOffset;
    }
    embeddedOffset = segment.embeddedEndOffset;
    previousHostEnd = segment.hostEndOffset;
  }
  if (embeddedOffset !== source.length
    || hostBodySpan.startOffset !== segments[0]!.hostStartOffset
    || hostBodySpan.endOffset < segments.at(-1)!.hostEndOffset) return undefined;

  if (startOffset === source.length) hostStart = hostBodySpan.endOffset;
  if (endOffset === source.length) hostEnd = hostBodySpan.endOffset;
  else if (endOffset === 0) hostEnd = segments[0]!.hostStartOffset;
  if (startOffset === endOffset) {
    return hostStart === undefined ? undefined : { startOffset: hostStart, endOffset: hostStart };
  }
  if (hostStart === undefined || hostEnd === undefined || hostEnd < hostStart) return undefined;
  return { startOffset: hostStart, endOffset: hostEnd };
}
