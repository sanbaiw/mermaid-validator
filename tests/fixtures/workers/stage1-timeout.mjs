import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  if (request.source !== "timeout") process.send?.(accepted(request.requestId));
});
