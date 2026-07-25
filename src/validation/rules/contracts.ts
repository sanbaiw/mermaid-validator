export interface RuleTextSpan {
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface RuleTextEdit {
  readonly span: RuleTextSpan;
  readonly newText: string;
}

export type RuleSeveritySetting = "off" | "warning" | "error";
export type RulePrerequisite = "text" | "syntax-valid";

export interface RuleOptionsSchema<Options> {
  readonly parse: (input: unknown) =>
    | { readonly ok: true; readonly value: Options }
    | { readonly ok: false; readonly message: string };
}

export interface RuleContext<Options> {
  readonly source: string;
  readonly documentUri: string;
  readonly diagramIndex: number;
  readonly diagramType?: string;
  readonly options: Options;
  readonly signal?: AbortSignal;
}

export interface RuleReport {
  readonly message: string;
  readonly span?: RuleTextSpan;
  readonly help?: string;
  readonly fixes?: readonly RuleTextEdit[];
}

export interface RuleModule<Options = unknown> {
  readonly id: string;
  readonly defaultSeverity: RuleSeveritySetting;
  readonly prerequisite: RulePrerequisite;
  readonly diagramTypes?: readonly string[];
  readonly optionsSchema: RuleOptionsSchema<Options>;
  readonly defaultOptions: unknown;
  readonly run: (context: RuleContext<Options>) => Promise<readonly RuleReport[]>;
}

export interface RuleRegistry {
  readonly modules: readonly RuleModule<any>[];
  readonly get: (id: string) => RuleModule<any> | undefined;
}

export interface ResolvedRuleSetting {
  readonly severity: RuleSeveritySetting;
  readonly options: unknown;
}

export type ResolvedRuleConfigurationPatch = Readonly<Record<string, ResolvedRuleSetting>>;
export type ResolvedRuleConfiguration = Readonly<Record<string, ResolvedRuleSetting>>;

export type RuleConfigurationPatchResolution =
  | { readonly ok: true; readonly value: ResolvedRuleConfigurationPatch }
  | { readonly ok: false; readonly message: string };

export interface ExecutedRuleFinding {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly source: "rule" | "system";
  readonly span?: RuleTextSpan;
  readonly help?: string;
  readonly fixes?: readonly RuleTextEdit[];
}
