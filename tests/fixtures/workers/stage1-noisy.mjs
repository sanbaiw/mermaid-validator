import { accepted, runtimeFailure } from "./stage1-shared.mjs";

process.stdout.write("PRIVATE_STDOUT_MARKER");
process.send?.({ type: "ready" });
process.on("message", (request) => {
  process.stderr.write(`${"x".repeat(5000)}PRIVATE_STDERR_MARKER`, () => {
    process.send?.(request.source === "runtime" ? runtimeFailure(request.requestId) : accepted(request.requestId));
  });
});
