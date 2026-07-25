import type {
  ResolvedRuleConfiguration,
  ResolvedRuleConfigurationPatch,
  RuleConfigurationPatchResolution,
  RuleRegistry,
  RuleSeveritySetting,
} from "./contracts.js";

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function parseSetting(
  id: string,
  input: unknown,
  registry: RuleRegistry,
): RuleConfigurationPatchResolution {
  const module = registry.get(id);
  if (!module) return { ok: false, message: `Unknown rule: ${id}` };
  let severity: RuleSeveritySetting;
  let rawOptions: unknown = module.defaultOptions;
  if (input === "off" || input === "warning" || input === "error") {
    severity = input;
  } else if (Array.isArray(input) && input.length === 2
    && (input[0] === "off" || input[0] === "warning" || input[0] === "error")) {
    severity = input[0];
    rawOptions = input[1];
  } else {
    return { ok: false, message: `Invalid setting for rule: ${id}` };
  }
  const options = module.optionsSchema.parse(rawOptions);
  if (!options.ok) return { ok: false, message: `Invalid options for ${id}: ${options.message}` };
  return { ok: true, value: Object.freeze({ [id]: Object.freeze({ severity, options: options.value }) }) };
}

export function resolveRuleConfigurationPatchWithRegistry(
  input: unknown,
  registry: RuleRegistry,
): RuleConfigurationPatchResolution {
  if (!isRecord(input)) return { ok: false, message: "Rule configuration must be an object" };
  const resolved: Record<string, { readonly severity: RuleSeveritySetting; readonly options: unknown }> = {};
  for (const [id, setting] of Object.entries(input)) {
    const parsed = parseSetting(id, setting, registry);
    if (!parsed.ok) return parsed;
    resolved[id] = parsed.value[id]!;
  }
  return { ok: true, value: Object.freeze(resolved) };
}

export function mergeRuleConfigurationPatches(
  base: ResolvedRuleConfigurationPatch,
  patch: ResolvedRuleConfigurationPatch,
): ResolvedRuleConfigurationPatch {
  return Object.freeze({ ...base, ...patch });
}

export function materializeRuleConfigurationWithRegistry(
  patch: ResolvedRuleConfigurationPatch,
  registry: RuleRegistry,
): ResolvedRuleConfiguration {
  const resolved: Record<string, { readonly severity: RuleSeveritySetting; readonly options: unknown }> = {};
  for (const module of registry.modules) {
    const configured = patch[module.id];
    if (configured) resolved[module.id] = configured;
    else {
      const parsed = module.optionsSchema.parse(module.defaultOptions);
      if (!parsed.ok) throw new Error(`Invalid registered defaults for ${module.id}`);
      resolved[module.id] = Object.freeze({ severity: module.defaultSeverity, options: parsed.value });
    }
  }
  return Object.freeze(resolved);
}
