import type { RuleTextEdit } from "./contracts.js";

export type NormalizedEditsResult =
  | { readonly ok: true; readonly edits: readonly RuleTextEdit[] }
  | { readonly ok: false; readonly reason: "invalid" | "conflict" };

function isValidEdit(edit: RuleTextEdit, sourceLength: number): boolean {
  return typeof edit.newText === "string"
    && Number.isSafeInteger(edit.span.startOffset)
    && Number.isSafeInteger(edit.span.endOffset)
    && edit.span.startOffset >= 0
    && edit.span.endOffset > edit.span.startOffset
    && edit.span.endOffset <= sourceLength;
}

export function normalizeEdits(
  edits: readonly RuleTextEdit[],
  sourceLength: number,
): NormalizedEditsResult {
  if (edits.some((edit) => !isValidEdit(edit, sourceLength))) return { ok: false, reason: "invalid" };
  const ordered = [...edits].sort((left, right) => (
    left.span.startOffset - right.span.startOffset
    || left.span.endOffset - right.span.endOffset
    || left.newText.localeCompare(right.newText)
  ));
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]!;
    const current = ordered[index]!;
    if (current.span.startOffset < previous.span.endOffset) {
      return { ok: false, reason: "conflict" };
    }
  }
  return { ok: true, edits: Object.freeze(ordered) };
}

export function applyEdits(source: string, edits: readonly RuleTextEdit[]): string {
  let output = source;
  for (const edit of [...edits].sort((left, right) => (
    right.span.startOffset - left.span.startOffset || right.span.endOffset - left.span.endOffset
  ))) {
    output = `${output.slice(0, edit.span.startOffset)}${edit.newText}${output.slice(edit.span.endOffset)}`;
  }
  return output;
}
