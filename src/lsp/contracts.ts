import {
  materializeRuleConfiguration,
  resolveRuleConfigurationPatch,
  type ResolvedRuleConfiguration,
} from "../validation/index.js";

export const DEFAULT_DEBOUNCE_MS = 150;
export const MAX_DEBOUNCE_MS = 2_000;
const MAX_INITIALIZATION_ERROR_LENGTH = 256;

export interface ResolvedLspInitialization {
  readonly debounceMs: number;
  readonly rules: ResolvedRuleConfiguration;
}

export type LspInitializationResolution =
  | { readonly ok: true; readonly value: ResolvedLspInitialization }
  | { readonly ok: false; readonly message: string };

export type LspTransportResolution =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function boundedInitializationError(message: string): string {
  if (message.length <= MAX_INITIALIZATION_ERROR_LENGTH) return message;
  return `${message.slice(0, MAX_INITIALIZATION_ERROR_LENGTH - 3)}...`;
}

export function resolveLspInitializationOptions(input: unknown): LspInitializationResolution {
  if (input === undefined || input === null) {
    return {
      ok: true,
      value: Object.freeze({
        debounceMs: DEFAULT_DEBOUNCE_MS,
        rules: materializeRuleConfiguration(Object.freeze({})),
      }),
    };
  }
  if (!isRecord(input)) {
    return { ok: false, message: "Initialization options must be an object or null" };
  }
  const unknownKey = Object.keys(input).find((key) => key !== "debounceMs" && key !== "rules");
  if (unknownKey !== undefined) {
    return {
      ok: false,
      message: boundedInitializationError(`Unknown initialization option: ${unknownKey}`),
    };
  }

  const debounceMs = input.debounceMs === undefined ? DEFAULT_DEBOUNCE_MS : input.debounceMs;
  if (!Number.isSafeInteger(debounceMs)
    || typeof debounceMs !== "number"
    || debounceMs < 0
    || debounceMs > MAX_DEBOUNCE_MS) {
    return { ok: false, message: "debounceMs must be a safe integer from 0 through 2000" };
  }

  const rulePatch = resolveRuleConfigurationPatch(input.rules === undefined ? {} : input.rules);
  if (!rulePatch.ok) {
    return { ok: false, message: boundedInitializationError(rulePatch.message) };
  }
  return {
    ok: true,
    value: Object.freeze({
      debounceMs,
      rules: materializeRuleConfiguration(rulePatch.value),
    }),
  };
}

export function resolveLspTransportArguments(arguments_: readonly string[]): LspTransportResolution {
  if (arguments_.length === 1 && arguments_[0] === "--stdio") return { ok: true };
  return {
    ok: false,
    message: "Usage: mermaid-validator-language-server --stdio",
  };
}
