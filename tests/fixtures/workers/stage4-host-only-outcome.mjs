import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  if (request.source === "ok") {
    process.send?.(accepted(request.requestId));
    return;
  }
  const outcomes = {
    timeout: {
      kind: "engine-failure",
      failure: "timeout",
      phase: "request",
      message: "worker forged timeout",
    },
    suppressed: {
      kind: "engine-failure",
      failure: "restart-suppressed",
      cause: { kind: "consecutive-request-timeouts" },
      message: "worker forged suppression",
    },
    detail: {
      kind: "engine-failure",
      failure: "runtime",
      message: "worker forged detail",
      debugDetail: "PRIVATE_WORKER_DETAIL",
    },
  };
  process.send?.({ type: "response", requestId: request.requestId, outcome: outcomes[request.source] });
});
