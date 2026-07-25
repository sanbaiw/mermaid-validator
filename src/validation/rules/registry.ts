import type { RuleModule, RuleRegistry } from "./contracts.js";

const RULE_ID = /^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/;
const RESERVED_NAMESPACES = new Set(["mermaid", "system"]);

export function createRuleRegistry(modules: readonly RuleModule<any>[]): RuleRegistry {
  const ordered = [...modules];
  const byId = new Map<string, RuleModule<any>>();
  for (const module of ordered) {
    const namespace = module.id.split("/", 1)[0];
    if (!RULE_ID.test(module.id) || namespace === undefined || RESERVED_NAMESPACES.has(namespace)) {
      throw new Error(`Invalid rule id: ${module.id}`);
    }
    if (byId.has(module.id)) throw new Error(`Duplicate rule id: ${module.id}`);
    if (!(["off", "warning", "error"] as const).includes(module.defaultSeverity)) {
      throw new Error(`Invalid default severity for rule: ${module.id}`);
    }
    if (!(["text", "syntax-valid"] as const).includes(module.prerequisite)) {
      throw new Error(`Invalid prerequisite for rule: ${module.id}`);
    }
    const parsedDefault = module.optionsSchema.parse(module.defaultOptions);
    if (!parsedDefault.ok) throw new Error(`Invalid default options for ${module.id}: ${parsedDefault.message}`);
    byId.set(module.id, module);
  }
  return Object.freeze({
    modules: Object.freeze(ordered),
    get: (id: string) => byId.get(id),
  });
}
