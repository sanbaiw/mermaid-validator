export interface CopiedSegment {
  readonly embeddedStartOffset: number;
  readonly embeddedEndOffset: number;
  readonly hostStartOffset: number;
  readonly hostEndOffset: number;
}

export interface EmbeddedSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface HostSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface ExtractedDiagram {
  readonly source: string;
  readonly segments: readonly CopiedSegment[];
  readonly hostBodySpan: HostSpan;
}

export type MarkdownExtractionResult =
  | { readonly kind: "ok"; readonly diagrams: readonly ExtractedDiagram[] }
  | { readonly kind: "failure"; readonly message: string };
