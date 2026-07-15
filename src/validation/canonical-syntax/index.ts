import type { SyntaxOutcome } from "./protocol.js";
import { requestCanonicalSyntax } from "./worker-host.js";

export type { SyntaxOutcome } from "./protocol.js";

export async function checkCanonicalSyntax(
  source: string,
  options: { signal?: AbortSignal } = {},
): Promise<SyntaxOutcome> {
  return await requestCanonicalSyntax(source, options.signal);
}
