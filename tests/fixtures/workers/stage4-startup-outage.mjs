import { readFileSync, writeFileSync } from "node:fs";

const markerPath = process.env.STAGE4_WORKER_LAUNCH_MARKER;
if (!markerPath) throw new Error("STAGE4_WORKER_LAUNCH_MARKER is required");

let launchCount = 0;
try {
  launchCount = Number.parseInt(readFileSync(markerPath, "utf8"), 10) || 0;
} catch {
  // The first worker creates the marker.
}
writeFileSync(markerPath, String(launchCount + 1));

// Keep the IPC channel open without ever reporting readiness.
process.on("message", () => {});
