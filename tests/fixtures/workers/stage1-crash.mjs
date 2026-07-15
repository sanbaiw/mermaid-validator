import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  if (request.source === "crash") process.exit(7);
  process.send?.(accepted(request.requestId));
});
