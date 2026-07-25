import { z, type ZodType } from "zod";
import type { RuleOptionsSchema } from "./contracts.js";

function boundedMessage(path: string, message: string): string {
  const compact = message.replace(/\s+/g, " ").trim().slice(0, 180);
  return `${path}: ${compact || "invalid value"}`;
}

export function zodRuleOptionsSchema<Options>(
  schema: ZodType<Options>,
  path = "options",
): RuleOptionsSchema<Options> {
  return {
    parse(input) {
      const parsed = schema.safeParse(input);
      if (parsed.success) return { ok: true, value: parsed.data };
      const issue = parsed.error.issues[0];
      const issuePath = issue?.path.length ? `${path}.${issue.path.join(".")}` : path;
      return { ok: false, message: boundedMessage(issuePath, issue?.message ?? "invalid value") };
    },
  };
}

export const strictEmptyOptionsSchema = zodRuleOptionsSchema(z.object({}).strict());

export function positiveIntegerOptionsSchema<Key extends string>(key: Key) {
  return zodRuleOptionsSchema(z.object({ [key]: z.number().int().positive() }).strict()) as RuleOptionsSchema<
    Readonly<Record<Key, number>>
  >;
}
