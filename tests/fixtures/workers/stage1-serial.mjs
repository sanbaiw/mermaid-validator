import { accepted } from "./stage1-shared.mjs";

let active = 0;
process.send?.({ type: "ready" });
process.on("message", (request) => {
  active += 1;
  const delay = request.source === "first" ? 30 : 0;
  setTimeout(() => {
    const response = accepted(request.requestId, active > 1 ? "state" : "flowchart");
    active -= 1;
    process.send?.(response);
  }, delay);
});
