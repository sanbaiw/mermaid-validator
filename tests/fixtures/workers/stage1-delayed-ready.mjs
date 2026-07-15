import { readFileSync, writeFileSync } from "node:fs";
import { accepted } from "./stage1-shared.mjs";

const markerPath = process.env.STAGE1_DELAYED_READY_MARKER;
if (!markerPath) throw new Error("STAGE1_DELAYED_READY_MARKER is required");

let launchCount = 0;
try {
  launchCount = Number.parseInt(readFileSync(markerPath, "utf8"), 10) || 0;
} catch {
  // The first worker creates the marker.
}
launchCount += 1;
writeFileSync(markerPath, String(launchCount));

setTimeout(() => process.send?.({ type: "ready" }), 300);
process.on("message", (request) => {
  process.send?.(accepted(request.requestId, launchCount === 1 ? "state" : "flowchart"));
});
