import type { EngineId } from "./contracts.js";

export const ENGINE_VERSIONS = {
  "official-mermaid": "11.16.0",
  "mermaid-lint-official": "0.35.0",
  "mermaid-lint-aggregate": "0.35.0",
  merman: "0.7.0",
} as const satisfies Record<EngineId, string>;
