import { fileURLToPath } from "node:url";
import type { ValidationResult } from "../validation/index.js";

const MAX_CONTEXT_CODE_UNITS = 160;

interface LineContext {
  readonly line: number;
  readonly column: number;
  readonly source: string;
}

function isBoundedSpan(span: { readonly startOffset: number; readonly endOffset: number }, length: number): boolean {
  return Number.isSafeInteger(span.startOffset)
    && Number.isSafeInteger(span.endOffset)
    && span.startOffset >= 0
    && span.endOffset >= span.startOffset
    && span.endOffset <= length;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xDC00 && code <= 0xDFFF;
}

function boundedWindow(sourceLine: string, columnOffset: number): string {
  if (sourceLine.length <= MAX_CONTEXT_CODE_UNITS) return sourceLine;
  let start = Math.max(0, Math.min(columnOffset - Math.floor(MAX_CONTEXT_CODE_UNITS / 2),
    sourceLine.length - MAX_CONTEXT_CODE_UNITS));
  let end = Math.min(sourceLine.length, start + MAX_CONTEXT_CODE_UNITS);
  if (start > 0
    && isLowSurrogate(sourceLine.charCodeAt(start))
    && isHighSurrogate(sourceLine.charCodeAt(start - 1))) start += 1;
  if (end < sourceLine.length
    && isHighSurrogate(sourceLine.charCodeAt(end - 1))
    && isLowSurrogate(sourceLine.charCodeAt(end))) end -= 1;
  return `${start > 0 ? "..." : ""}${sourceLine.slice(start, end)}${end < sourceLine.length ? "..." : ""}`;
}

function lineContext(source: string, offset: number): LineContext {
  const before = source.slice(0, offset);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const nextNewline = source.indexOf("\n", offset);
  const lineEnd = nextNewline === -1 ? source.length : nextNewline;
  const sourceLine = source.slice(lineStart, lineEnd).replace(/\r$/, "");
  return {
    line,
    column: offset - lineStart + 1,
    source: boundedWindow(sourceLine, Math.min(offset - lineStart, sourceLine.length)),
  };
}

function precisionMarker(precision: "exact" | "approximate" | "document"): string {
  if (precision === "approximate") return " [approximate]";
  if (precision === "document") return " [document]";
  return "";
}

export function formatTerminal(result: ValidationResult, sourceText: string): string {
  if (result.findings.length === 0) return "";
  const path = fileURLToPath(result.documentUri);
  const formatted = result.findings.map((finding) => {
    const context = finding.span !== undefined && isBoundedSpan(finding.span, sourceText.length)
      ? lineContext(sourceText, finding.span.startOffset)
      : undefined;
    const location = context === undefined ? "" : `:${context.line}:${context.column}`;
    const fixable = (finding.fixes?.length ?? 0) > 0 ? " [fixable]" : "";
    const lines = [
      `${path}${location}: ${finding.severity} ${finding.code}${precisionMarker(finding.locationPrecision)}: ${finding.message}${fixable}`,
    ];
    const continuationPrefix = `${" ".repeat(String(context?.line ?? "").length + 2)} | `;
    if (context !== undefined) lines.push(`  ${context.line} | ${context.source}`);
    if (finding.locationPrecision === "approximate") {
      lines.push(`${continuationPrefix}location is approximate; inspect this host line`);
    } else if (finding.locationPrecision === "document") {
      lines.push(`${continuationPrefix}location applies to the document`);
    }
    if (finding.help !== undefined) lines.push(`${continuationPrefix}help: ${finding.help}`);
    return lines.join("\n");
  });
  return `${formatted.join("\n")}\n`;
}
