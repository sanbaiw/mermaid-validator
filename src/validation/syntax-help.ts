export interface SyntaxHelpInput {
  readonly source: string;
  readonly diagramType?: string;
  readonly line?: number;
}

const SEQUENCE_NOTE_SEMICOLON_HELP =
  "In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.";

export function helpForSyntaxError(input: SyntaxHelpInput): string | undefined {
  if (input.diagramType !== "sequence"
    || input.line === undefined
    || !Number.isFinite(input.line)
    || !Number.isInteger(input.line)
    || input.line <= 0) return undefined;

  const sourceLine = input.source.split("\n")[input.line - 1]?.replace(/\r$/, "");
  if (sourceLine === undefined) return undefined;
  const note = /^\s*note\s+(?:left\s+of|right\s+of|over)\s+[^:]+:(.*)$/i.exec(sourceLine);
  return note?.[1]?.includes(";<br/>") ? SEQUENCE_NOTE_SEMICOLON_HELP : undefined;
}
