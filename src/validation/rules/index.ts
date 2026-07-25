import { noMarkdownHeadingInLabelRule } from "./builtins/no-markdown-heading-in-label.js";
import {
  materializeRuleConfigurationWithRegistry,
  mergeRuleConfigurationPatches,
  resolveRuleConfigurationPatchWithRegistry,
} from "./configuration.js";
import { applyEdits, normalizeEdits } from "./fixes.js";
import { createRuleRegistry } from "./registry.js";
import { runRules } from "./run-rules.js";

export type {
  ExecutedRuleFinding,
  ResolvedRuleConfiguration,
  ResolvedRuleConfigurationPatch,
  ResolvedRuleSetting,
  RuleConfigurationPatchResolution,
  RuleContext,
  RuleModule,
  RuleOptionsSchema,
  RulePrerequisite,
  RuleRegistry,
  RuleReport,
  RuleSeveritySetting,
  RuleTextEdit,
  RuleTextSpan,
} from "./contracts.js";
export { positiveIntegerOptionsSchema, strictEmptyOptionsSchema, zodRuleOptionsSchema } from "./options-schema.js";
export { createRuleRegistry, runRules, normalizeEdits, applyEdits, mergeRuleConfigurationPatches };

export const builtInRuleRegistry = createRuleRegistry([noMarkdownHeadingInLabelRule]);

export function resolveRuleConfigurationPatch(input: unknown) {
  return resolveRuleConfigurationPatchWithRegistry(input, builtInRuleRegistry);
}

export function materializeRuleConfiguration(patch: Parameters<typeof materializeRuleConfigurationWithRegistry>[0]) {
  return materializeRuleConfigurationWithRegistry(patch, builtInRuleRegistry);
}

export { materializeRuleConfigurationWithRegistry, resolveRuleConfigurationPatchWithRegistry };
