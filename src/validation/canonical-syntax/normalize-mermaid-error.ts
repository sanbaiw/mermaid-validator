import type { SyntaxOutcome } from "./protocol.js";

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function usefulMessage(error: unknown): string {
  const value = record(error);
  const raw = typeof value?.message === "string"
    ? value.message
    : error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Invalid Mermaid syntax";
  const collapsed = raw.replace(/\s+/g, " ").trim();
  const withoutExpectedTokens = collapsed.replace(/\s+Expecting\s+.*$/i, "").trim();
  return withoutExpectedTokens.slice(0, 500) || "Invalid Mermaid syntax";
}

export function normalizeMermaidError(
  error: unknown,
  engineVersion: string,
  diagramType?: string,
): Extract<SyntaxOutcome, { kind: "syntax-error" }> {
  const value = record(error);
  const hash = record(value?.hash);
  const loc = record(hash?.loc);
  const line = typeof loc?.first_line === "number"
    ? loc.first_line
    : typeof hash?.line === "number"
      ? hash.line
      : typeof value?.line === "number"
        ? value.line
        : undefined;
  const column = typeof loc?.first_column === "number"
    ? loc.first_column + 1
    : typeof value?.col === "number"
      ? value.col
      : typeof value?.column === "number"
        ? value.column
        : undefined;
  const location = line === undefined && column === undefined
    ? undefined
    : { ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) };
  return {
    kind: "syntax-error",
    message: `Mermaid syntax error: ${usefulMessage(error)}`,
    ...(diagramType === undefined ? {} : { diagramType }),
    ...(location === undefined ? {} : { location }),
    locationPrecision: location === undefined ? "document" : "approximate",
    engineVersion,
  };
}
