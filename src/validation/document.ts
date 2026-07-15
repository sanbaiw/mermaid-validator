export interface DocumentSnapshot {
  readonly uri: string;
  readonly languageId: "mermaid";
  readonly text: string;
  readonly version?: number;
}

export interface ValidateOptions {
  readonly mode?: "canonical";
  readonly signal?: AbortSignal;
}
