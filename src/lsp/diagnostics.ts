import {
  DiagnosticSeverity,
  type Diagnostic,
  type TextEdit as ProtocolTextEdit,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { Finding, TextEdit, ValidationResult } from "../validation/index.js";

export interface ProjectedFinding {
  readonly finding: Finding;
  readonly diagnostic: Diagnostic;
}

const DOCUMENT_ANCHOR = Object.freeze({
  start: Object.freeze({ line: 0, character: 0 }),
  end: Object.freeze({ line: 0, character: 0 }),
});

function isBoundedSpan(
  span: { readonly startOffset: number; readonly endOffset: number },
  length: number,
): boolean {
  return Number.isSafeInteger(span.startOffset)
    && Number.isSafeInteger(span.endOffset)
    && span.startOffset >= 0
    && span.endOffset >= span.startOffset
    && span.endOffset <= length;
}

function severityFor(finding: Finding): DiagnosticSeverity {
  if (finding.severity === "error") return DiagnosticSeverity.Error;
  if (finding.severity === "warning") return DiagnosticSeverity.Warning;
  return DiagnosticSeverity.Information;
}

function messageFor(finding: Finding): string {
  const precision = finding.locationPrecision === "approximate"
    ? "[approximate location] "
    : finding.locationPrecision === "document"
      ? "[document-level location] "
      : "";
  const help = finding.help === undefined ? "" : `\nHelp: ${finding.help}`;
  return `${precision}${finding.message}${help}`;
}

export function projectValidationResult(
  document: TextDocument,
  result: ValidationResult,
): readonly ProjectedFinding[] {
  const length = document.getText().length;
  return result.findings.map((finding) => {
    const range = finding.span && isBoundedSpan(finding.span, length)
      ? {
          start: document.positionAt(finding.span.startOffset),
          end: document.positionAt(finding.span.endOffset),
        }
      : DOCUMENT_ANCHOR;
    return Object.freeze({
      finding,
      diagnostic: Object.freeze({
        range,
        severity: severityFor(finding),
        code: finding.code,
        source: "mermaid-validator",
        message: messageFor(finding),
      }),
    });
  });
}

export function projectPlanEdits(
  document: TextDocument,
  edits: readonly TextEdit[],
): readonly ProtocolTextEdit[] | undefined {
  const length = document.getText().length;
  const projected: ProtocolTextEdit[] = [];
  for (const edit of edits) {
    if (!isBoundedSpan(edit.span, length) || edit.span.endOffset <= edit.span.startOffset) {
      return undefined;
    }
    projected.push(Object.freeze({
      range: {
        start: document.positionAt(edit.span.startOffset),
        end: document.positionAt(edit.span.endOffset),
      },
      newText: edit.newText,
    }));
  }
  return Object.freeze(projected);
}
