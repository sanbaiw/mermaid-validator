import { accepted, runtimeFailure } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  process.send?.(request.source === "runtime" ? runtimeFailure(request.requestId) : accepted(request.requestId));
});
