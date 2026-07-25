export interface DocumentSnapshot {
  readonly uri: string;
  readonly languageId: "mermaid" | "markdown";
  readonly text: string;
  readonly version?: number;
}

export interface ValidateOptions {
  readonly mode?: "canonical";
  readonly rules?: ResolvedRuleConfiguration;
  readonly signal?: AbortSignal;
}
import type { ResolvedRuleConfiguration } from "./rules/index.js";
