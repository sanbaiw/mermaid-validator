import type { DocumentSnapshot, ValidateOptions } from "./document.js";
import type { Finding, TextEdit, ValidationResult } from "./findings.js";
import { applyEdits, normalizeEdits } from "./rules/index.js";
import { validateDocument } from "./validate-document.js";

export type DocumentFixStatus = "unchanged" | "changed" | "conflict" | "invalid" | "unsafe" | "non-idempotent";

export interface DocumentFixPlan {
  readonly status: DocumentFixStatus;
  readonly edits: readonly TextEdit[];
  readonly originalResult: ValidationResult;
  readonly output?: string;
  readonly proposedResult?: ValidationResult;
  readonly failureResult?: ValidationResult;
}

function hasCanonicalOrSystemError(result: ValidationResult): boolean {
  return result.findings.some((finding) => finding.severity === "error"
    && (finding.source === "mermaid" || finding.source === "system"));
}

function withFailure(original: ValidationResult, finding: Finding): ValidationResult {
  return { ...original, valid: false, findings: [...original.findings, finding] };
}

function fixFailure(code: "system/fix-conflict" | "system/fix-protocol-error"
| "system/fix-validation-failed" | "system/fix-non-idempotent", message: string): Finding {
  return { code, severity: "error", message, source: "system", locationPrecision: "document" };
}

export async function planDocumentFixesWithValidator(
  document: DocumentSnapshot,
  options: ValidateOptions,
  validate: typeof validateDocument,
): Promise<DocumentFixPlan> {
  const originalResult = await validate(document, options);
  if (hasCanonicalOrSystemError(originalResult)) return { status: "unsafe", edits: [], originalResult };
  const candidates = originalResult.findings.flatMap((finding) => {
    const unique = new Map<string, TextEdit>();
    for (const edit of finding.fixes ?? []) {
      unique.set(`${edit.span.startOffset}:${edit.span.endOffset}:${JSON.stringify(edit.newText)}`, edit);
    }
    return [...unique.values()];
  });
  if (candidates.length === 0) return { status: "unchanged", edits: [], originalResult };
  const normalized = normalizeEdits(candidates, document.text.length);
  if (!normalized.ok) {
    const conflict = normalized.reason === "conflict";
    return {
      status: conflict ? "conflict" : "invalid",
      edits: [],
      originalResult,
      failureResult: withFailure(originalResult, fixFailure(
        conflict ? "system/fix-conflict" : "system/fix-protocol-error",
        conflict ? "Candidate fixes conflict" : "Candidate fix data is invalid",
      )),
    };
  }
  const edits: readonly TextEdit[] = normalized.edits;
  const output = applyEdits(document.text, edits);
  const proposedResult = await validate({ ...document, text: output }, options);
  if (hasCanonicalOrSystemError(proposedResult)) {
    return {
      status: "unsafe", edits: [], originalResult,
      failureResult: withFailure(originalResult, fixFailure(
        "system/fix-validation-failed", "Proposed fixes failed canonical validation",
      )),
    };
  }
  if (proposedResult.findings.some((finding) => (finding.fixes?.length ?? 0) > 0)) {
    return {
      status: "non-idempotent", edits: [], originalResult,
      failureResult: withFailure(originalResult, fixFailure(
        "system/fix-non-idempotent", "Proposed fixes are not idempotent across the enabled rule selection",
      )),
    };
  }
  return { status: "changed", edits, originalResult, output, proposedResult };
}

export async function planDocumentFixes(
  document: DocumentSnapshot,
  options: ValidateOptions = {},
): Promise<DocumentFixPlan> {
  return await planDocumentFixesWithValidator(document, options, validateDocument);
}
