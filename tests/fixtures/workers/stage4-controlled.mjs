import { readFileSync, writeFileSync } from "node:fs";
import { accepted, runtimeFailure } from "./stage1-shared.mjs";

function increment(path) {
  let count = 0;
  try {
    count = Number.parseInt(readFileSync(path, "utf8"), 10) || 0;
  } catch {
    // The first observation creates the marker.
  }
  count += 1;
  writeFileSync(path, String(count));
  return count;
}

const launchMarker = process.env.STAGE4_WORKER_LAUNCH_MARKER;
if (!launchMarker) throw new Error("STAGE4_WORKER_LAUNCH_MARKER is required");
const launchCount = increment(launchMarker);

const ready = () => process.send?.({ type: "ready" });
if (process.env.STAGE4_DELAY_READY_AFTER_FIRST === "1" && launchCount > 1) setTimeout(ready, 150);
else ready();

process.on("message", (request) => {
  const requestMarker = process.env.STAGE4_WORKER_REQUEST_MARKER;
  if (requestMarker) increment(requestMarker);
  if (request.source === "timeout") return;
  if (request.source === "runtime") {
    process.send?.(runtimeFailure(request.requestId));
    return;
  }
  if (request.source === "syntax-error") {
    process.send?.({
      type: "response",
      requestId: request.requestId,
      outcome: {
        kind: "syntax-error",
        message: "Mermaid syntax error: synthetic",
        locationPrecision: "document",
        engineVersion: "11.16.0",
      },
    });
    return;
  }
  if (request.source === "unsupported") {
    process.send?.({
      type: "response",
      requestId: request.requestId,
      outcome: {
        kind: "unsupported-type",
        diagramType: "gantt",
        message: "Mermaid diagram type \"gantt\" is not supported",
        engineVersion: "11.16.0",
      },
    });
    return;
  }
  process.send?.(accepted(request.requestId));
});
