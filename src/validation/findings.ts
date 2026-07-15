export type LocationPrecision = "exact" | "approximate" | "document";

export type BuiltInFindingCode =
  | "mermaid/syntax-error"
  | "mermaid/unsupported-diagram-type"
  | "system/parser-initialization-failed"
  | "system/parser-timeout"
  | "system/parser-runtime-failed"
  | "system/parser-crashed"
  | "system/parser-protocol-error";

export interface TextSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface Finding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly source: "mermaid" | "rule" | "system";
  readonly span?: TextSpan;
  readonly locationPrecision: LocationPrecision;
  readonly diagramType?: string;
  readonly engine?: {
    readonly name: "mermaid";
    readonly version: string;
  };
  readonly help?: string;
}

export interface ValidationResult {
  readonly documentUri: string;
  readonly documentVersion?: number;
  readonly valid: boolean;
  readonly findings: readonly Finding[];
}
