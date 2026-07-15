import { fileURLToPath } from "node:url";
import type { ValidationResult } from "../validation/index.js";

function lineAndColumn(source: string, offset: number): { line: number; column: number } {
  const clamped = Math.max(0, Math.min(Math.floor(offset), source.length));
  const before = source.slice(0, clamped);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
  return { line, column: clamped - lastNewline };
}

export function formatTerminal(result: ValidationResult, sourceText: string): string {
  if (result.findings.length === 0) return "";
  const path = fileURLToPath(result.documentUri);
  return `${result.findings.map((finding) => {
    const location = finding.span === undefined
      ? ""
      : (() => {
          const { line, column } = lineAndColumn(sourceText, finding.span.startOffset);
          return `:${line}:${column}`;
        })();
    return `${path}${location}: ${finding.severity} ${finding.code}: ${finding.message}`;
  }).join("\n")}\n`;
}
