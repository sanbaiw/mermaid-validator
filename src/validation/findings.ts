export type LocationPrecision = "exact" | "approximate" | "document";

export type BuiltInFindingCode =
  | "mermaid/syntax-error"
  | "mermaid/unsupported-diagram-type"
  | "system/markdown-extraction-failed"
  | "system/parser-initialization-failed"
  | "system/parser-timeout"
  | "system/parser-runtime-failed"
  | "system/parser-crashed"
  | "system/parser-protocol-error"
  | "system/rule-runtime-failed"
  | "system/rule-protocol-error"
  | "system/fix-conflict"
  | "system/fix-protocol-error"
  | "system/fix-validation-failed"
  | "system/fix-non-idempotent";

export interface TextSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface TextEdit {
  readonly span: TextSpan;
  readonly newText: string;
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
  readonly fixes?: readonly TextEdit[];
}

export interface ValidationResult {
  readonly documentUri: string;
  readonly documentVersion?: number;
  readonly diagramCount: number;
  readonly valid: boolean;
  readonly findings: readonly Finding[];
}
