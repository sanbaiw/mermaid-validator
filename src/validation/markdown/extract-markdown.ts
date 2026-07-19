import { fromMarkdown } from "mdast-util-from-markdown";
import type {
  CopiedSegment,
  ExtractedDiagram,
  MarkdownExtractionResult,
} from "./contracts.js";

const EXTRACTION_FAILURE_MESSAGE = "Unable to extract Mermaid diagrams from Markdown";

interface PositionedNode {
  readonly type?: string;
  readonly lang?: string | null;
  readonly value?: string;
  readonly position?: {
    readonly start?: { readonly line?: number; readonly column?: number; readonly offset?: number };
    readonly end?: { readonly line?: number; readonly column?: number; readonly offset?: number };
  };
  readonly children?: readonly PositionedNode[];
}

interface PhysicalLine {
  readonly start: number;
  readonly contentEnd: number;
  readonly end: number;
}

function physicalLines(source: string): readonly PhysicalLine[] {
  const lines: PhysicalLine[] = [];
  let start = 0;
  while (start < source.length) {
    const lf = source.indexOf("\n", start);
    if (lf === -1) {
      lines.push({ start, contentEnd: source.length, end: source.length });
      return lines;
    }
    const contentEnd = lf > start && source.charCodeAt(lf - 1) === 13 ? lf - 1 : lf;
    lines.push({ start, contentEnd, end: lf + 1 });
    start = lf + 1;
  }
  lines.push({ start, contentEnd: start, end: start });
  return lines;
}

function valueLines(value: string): readonly string[] {
  if (value.length === 0) return [];
  const lines: string[] = [];
  let start = 0;
  for (let offset = 0; offset < value.length; offset += 1) {
    if (value.charCodeAt(offset) !== 10) continue;
    lines.push(value.slice(start, offset + 1));
    start = offset + 1;
  }
  if (start < value.length) lines.push(value.slice(start));
  return lines;
}

function collectMermaidNodes(root: PositionedNode): readonly PositionedNode[] {
  const nodes: PositionedNode[] = [];
  const visit = (node: PositionedNode): void => {
    if (node.type === "code" && node.lang === "mermaid") nodes.push(node);
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return nodes;
}

function openingFence(hostText: string, openingOffset: number): {
  readonly marker: "`" | "~";
  readonly length: number;
} | undefined {
  const marker = hostText[openingOffset];
  if (marker !== "`" && marker !== "~") return undefined;
  let end = openingOffset;
  while (hostText[end] === marker) end += 1;
  const length = end - openingOffset;
  return length >= 3 ? { marker, length } : undefined;
}

function hasExplicitClosingFence(
  hostText: string,
  copiedBodyEnd: number,
  nodeEnd: number,
  fence: { readonly marker: "`" | "~"; readonly length: number },
): boolean {
  if (copiedBodyEnd > nodeEnd) return false;
  return hostText.slice(copiedBodyEnd, nodeEnd).includes(fence.marker.repeat(fence.length));
}

function emptyBodyBoundary(
  hostText: string,
  lines: readonly PhysicalLine[],
  openingLineIndex: number,
  openingOffset: number,
): number | undefined {
  const next = lines[openingLineIndex + 1];
  if (!next) return hostText.length;
  const marker = hostText[openingOffset];
  if (marker !== "`" && marker !== "~") return undefined;
  const content = hostText.slice(next.start, next.contentEnd);
  const markerOffset = content.indexOf(marker);
  return markerOffset === -1 ? next.contentEnd : next.start + markerOffset;
}

function extractNode(
  hostText: string,
  lines: readonly PhysicalLine[],
  node: PositionedNode,
): ExtractedDiagram | undefined {
  const value = node.value;
  const startLine = node.position?.start?.line;
  const openingOffset = node.position?.start?.offset;
  const endOffset = node.position?.end?.offset;
  if (typeof value !== "string"
    || !Number.isSafeInteger(startLine)
    || !Number.isSafeInteger(openingOffset)
    || !Number.isSafeInteger(endOffset)
    || startLine! < 1
    || openingOffset! < 0
    || endOffset! < openingOffset!
    || endOffset! > hostText.length) return undefined;

  const openingLineIndex = startLine! - 1;
  const fence = openingFence(hostText, openingOffset!);
  if (fence === undefined) return undefined;
  if (value.length === 0) {
    const boundary = emptyBodyBoundary(hostText, lines, openingLineIndex, openingOffset!);
    if (boundary === undefined || boundary < 0 || boundary > hostText.length) return undefined;
    const finalBoundary = hasExplicitClosingFence(hostText, boundary, endOffset!, fence)
      ? boundary
      : endOffset!;
    return {
      source: value,
      segments: [],
      hostBodySpan: { startOffset: finalBoundary, endOffset: finalBoundary },
    };
  }

  const pieces = valueLines(value);
  const segments: CopiedSegment[] = [];
  let embeddedOffset = 0;
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index]!;
    const line = lines[openingLineIndex + 1 + index];
    if (!line) return undefined;
    const endsWithLf = piece.endsWith("\n");
    const targetEnd = endsWithLf ? line.end : line.contentEnd;
    const hostStart = targetEnd - piece.length;
    if (hostStart < line.start || hostText.slice(hostStart, targetEnd) !== piece) return undefined;
    segments.push({
      embeddedStartOffset: embeddedOffset,
      embeddedEndOffset: embeddedOffset + piece.length,
      hostStartOffset: hostStart,
      hostEndOffset: targetEnd,
    });
    embeddedOffset += piece.length;
  }
  const copiedBodyEnd = segments.at(-1)!.hostEndOffset;
  if (copiedBodyEnd > endOffset!) return undefined;
  const finalBodyEnd = hasExplicitClosingFence(hostText, copiedBodyEnd, endOffset!, fence)
    ? copiedBodyEnd
    : endOffset!;
  return {
    source: value,
    segments,
    hostBodySpan: {
      startOffset: segments[0]!.hostStartOffset,
      endOffset: finalBodyEnd,
    },
  };
}

export function extractMarkdownDiagrams(hostText: string): MarkdownExtractionResult {
  try {
    const root = fromMarkdown(hostText) as PositionedNode;
    const lines = physicalLines(hostText);
    const diagrams: ExtractedDiagram[] = [];
    for (const node of collectMermaidNodes(root)) {
      const diagram = extractNode(hostText, lines, node);
      if (!diagram) return { kind: "failure", message: EXTRACTION_FAILURE_MESSAGE };
      diagrams.push(diagram);
    }
    return { kind: "ok", diagrams };
  } catch {
    return { kind: "failure", message: EXTRACTION_FAILURE_MESSAGE };
  }
}
