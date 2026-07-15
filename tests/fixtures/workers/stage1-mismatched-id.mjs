import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  process.send?.(request.source === "mismatch" ? accepted(request.requestId + 1) : accepted(request.requestId));
});
