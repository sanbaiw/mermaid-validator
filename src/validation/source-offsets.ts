import type { TextSpan } from "./findings.js";

export interface SourceLocation {
  readonly line?: number;
  readonly column?: number;
}

function lineBounds(source: string, requestedLine: number): { start: number; end: number } | undefined {
  if (!Number.isFinite(requestedLine) || requestedLine < 1) return undefined;
  let start = 0;
  let line = 1;
  while (line < Math.floor(requestedLine)) {
    const newline = source.indexOf("\n", start);
    if (newline === -1) return undefined;
    start = newline + 1;
    line += 1;
  }
  const newline = source.indexOf("\n", start);
  let end = newline === -1 ? source.length : newline;
  if (end > start && source.charCodeAt(end - 1) === 13) end -= 1;
  return { start, end };
}

export function sourceLocationToSpan(source: string, location: SourceLocation): TextSpan | undefined {
  if (location.line === undefined) return undefined;
  const bounds = lineBounds(source, location.line);
  if (!bounds) return undefined;
  if (location.column === undefined) {
    return { startOffset: bounds.start, endOffset: bounds.end };
  }
  if (!Number.isFinite(location.column)) return undefined;
  const columnOffset = Math.max(0, Math.floor(location.column) - 1);
  const startOffset = Math.min(bounds.start + columnOffset, bounds.end);
  const endOffset = Math.min(startOffset + 1, bounds.end);
  return { startOffset, endOffset };
}
