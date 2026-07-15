import { checkCanonicalSyntax, type SyntaxOutcome } from "./canonical-syntax/index.js";
import type { DocumentSnapshot, ValidateOptions } from "./document.js";
import type { BuiltInFindingCode, Finding, ValidationResult } from "./findings.js";
import { sourceLocationToSpan } from "./source-offsets.js";

const FAILURE_CODES = {
  initialization: "system/parser-initialization-failed",
  timeout: "system/parser-timeout",
  runtime: "system/parser-runtime-failed",
  crash: "system/parser-crashed",
  protocol: "system/parser-protocol-error",
} as const satisfies Readonly<Record<string, BuiltInFindingCode>>;

function result(document: DocumentSnapshot, findings: readonly Finding[]): ValidationResult {
  return {
    documentUri: document.uri,
    ...(document.version === undefined ? {} : { documentVersion: document.version }),
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

export function resultFromSyntaxOutcome(
  document: DocumentSnapshot,
  outcome: SyntaxOutcome,
): ValidationResult {
  if (outcome.kind === "accepted") return result(document, []);
  let finding: Finding;
  if (outcome.kind === "syntax-error") {
    const code: BuiltInFindingCode = "mermaid/syntax-error";
    const span = outcome.location ? sourceLocationToSpan(document.text, outcome.location) : undefined;
    finding = {
      code,
      severity: "error",
      message: outcome.message,
      source: "mermaid",
      ...(span === undefined ? {} : { span }),
      locationPrecision: span === undefined ? "document" : outcome.locationPrecision,
      ...(outcome.diagramType === undefined ? {} : { diagramType: outcome.diagramType }),
      engine: { name: "mermaid", version: outcome.engineVersion },
    };
  } else if (outcome.kind === "unsupported-type") {
    const code: BuiltInFindingCode = "mermaid/unsupported-diagram-type";
    finding = {
      code,
      severity: "error",
      message: outcome.message,
      source: "mermaid",
      locationPrecision: "document",
      diagramType: outcome.diagramType,
      engine: { name: "mermaid", version: outcome.engineVersion },
    };
  } else {
    const code: BuiltInFindingCode = FAILURE_CODES[outcome.failure];
    finding = {
      code,
      severity: "error",
      message: outcome.message,
      source: "system",
      locationPrecision: "document",
    };
  }
  return result(document, [finding]);
}

export async function validateDocument(
  document: DocumentSnapshot,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const mode = options.mode ?? "canonical";
  if (mode !== "canonical") throw new Error(`Unsupported validation mode: ${String(mode)}`);
  try {
    return resultFromSyntaxOutcome(
      document,
      await checkCanonicalSyntax(document.text, options.signal === undefined ? {} : { signal: options.signal }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return resultFromSyntaxOutcome(document, {
      kind: "engine-failure",
      failure: "protocol",
      message: "Canonical Mermaid parser protocol failed",
    });
  }
}
