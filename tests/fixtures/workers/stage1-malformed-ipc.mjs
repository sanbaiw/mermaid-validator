import { accepted } from "./stage1-shared.mjs";

process.send?.({ type: "ready" });
process.on("message", (request) => {
  process.send?.(request.source === "malformed" ? { hello: "world" } : accepted(request.requestId));
});
