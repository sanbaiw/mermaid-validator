import { initializeMermaidRuntime, parseCanonicalSyntax } from "./mermaid-runtime.js";
import type { ValidateRequest, WorkerMessage, WorkerSyntaxOutcome } from "./protocol.js";

function send(message: WorkerMessage): void {
  if (process.send) process.send(message);
}

function isValidateRequest(value: unknown): value is ValidateRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  return request.type === "validate"
    && Number.isSafeInteger(request.requestId)
    && typeof request.source === "string";
}

try {
  await initializeMermaidRuntime();
  send({ type: "ready" });
} catch {
  send({
    type: "initialization-failed",
    message: "Canonical Mermaid parser failed to initialize",
  });
  process.exitCode = 1;
}

let work = Promise.resolve();
if (!process.exitCode) {
  process.on("message", (message: unknown) => {
    if (!isValidateRequest(message)) return;
    work = work.then(async () => {
      let outcome: WorkerSyntaxOutcome;
      try {
        outcome = await parseCanonicalSyntax(message.source);
      } catch {
        outcome = {
          kind: "engine-failure",
          failure: "runtime",
          message: "Canonical Mermaid parser failed while validating the document",
        };
      }
      send({ type: "response", requestId: message.requestId, outcome });
    });
  });
}
