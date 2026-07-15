import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  if (request.source === "fail") process.exit(9);
  process.send?.(accepted(request.requestId));
});
