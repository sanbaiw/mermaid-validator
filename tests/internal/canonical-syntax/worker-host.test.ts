import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CanonicalSyntaxWorkerHost } from "../../../src/validation/canonical-syntax/worker-host.js";

const fixture = (name: string): string => resolve(`tests/fixtures/workers/${name}.mjs`);
const hosts: CanonicalSyntaxWorkerHost[] = [];

function host(name: string, timeoutMs = 250): CanonicalSyntaxWorkerHost {
  const instance = new CanonicalSyntaxWorkerHost({
    workerPath: fixture(name),
    startupTimeoutMs: 500,
    requestTimeoutMs: timeoutMs,
  });
  hosts.push(instance);
  return instance;
}

async function waitForFile(path: string): Promise<string> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try {
      return await readFile(path, "utf8");
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    }
  }
  throw new Error(`Timed out waiting for ${path}`);
}

afterEach(() => {
  for (const instance of hosts.splice(0)) instance.dispose();
});

describe("CanonicalSyntaxWorkerHost", () => {
  it("serializes concurrent requests through one worker", async () => {
    const instance = host("stage1-serial");
    const outcomes = await Promise.all([
      instance.request("first"),
      instance.request("second"),
      instance.request("third"),
    ]);
    expect(outcomes.map((outcome) => outcome.kind)).toEqual(["accepted", "accepted", "accepted"]);
    expect(outcomes).not.toContainEqual(expect.objectContaining({ diagramType: "state" }));
  });

  it("classifies initialization failure without exposing raw stderr in the message", async () => {
    const outcome = await host("stage1-initialization-failure").request("anything");
    expect(outcome).toMatchObject({
      kind: "engine-failure",
      failure: "initialization",
      message: "Canonical Mermaid parser failed to initialize",
      debugDetail: "PRIVATE_INIT_DETAIL",
    });
    if (outcome.kind !== "engine-failure") throw new Error("Expected engine failure");
    expect(outcome.message).not.toContain("PRIVATE_INIT_DETAIL");
  });

  it("times out a request and starts a fresh worker for the next request", async () => {
    const instance = host("stage1-timeout", 75);
    await expect(instance.request("timeout")).resolves.toMatchObject({ kind: "engine-failure", failure: "timeout" });
    await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
  });

  it("discards a worker after a caught runtime failure", async () => {
    const instance = host("stage1-runtime-failure");
    await expect(instance.request("runtime")).resolves.toMatchObject({ kind: "engine-failure", failure: "runtime" });
    await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
  });

  it("classifies a crash and recovers on the next request", async () => {
    const instance = host("stage1-restart-after-failure");
    const failed = instance.request("fail");
    const queued = instance.request("ok");
    await expect(failed).resolves.toMatchObject({ kind: "engine-failure", failure: "crash" });
    await expect(queued).resolves.toMatchObject({ kind: "accepted" });
  });

  it.each([
    ["stage1-malformed-ipc", "malformed"],
    ["stage1-mismatched-id", "mismatch"],
  ])("classifies %s as a protocol failure and recovers", async (worker, source) => {
    const instance = host(worker);
    await expect(instance.request(source)).resolves.toMatchObject({ kind: "engine-failure", failure: "protocol" });
    await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
  });

  it("cancels queued and in-flight requests with AbortError", async () => {
    const instance = host("stage1-timeout", 500);
    const inFlight = new AbortController();
    const queued = new AbortController();
    const first = instance.request("timeout", inFlight.signal);
    const second = instance.request("ok", queued.signal);
    queued.abort();
    await expect(second).rejects.toMatchObject({ name: "AbortError" });
    inFlight.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
  });

  it("discards a starting worker when cancellation leaves no queued work", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "stage1-startup-cancel-"));
    const markerPath = join(temporaryDirectory, "launch-count");
    const previousMarker = process.env.STAGE1_DELAYED_READY_MARKER;
    process.env.STAGE1_DELAYED_READY_MARKER = markerPath;
    try {
      const instance = host("stage1-delayed-ready");
      const controller = new AbortController();
      const cancelled = instance.request("cancelled", controller.signal);
      await expect(waitForFile(markerPath)).resolves.toBe("1");
      controller.abort();
      await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });

      await expect(instance.request("ok")).resolves.toMatchObject({
        kind: "accepted",
        diagramType: "flowchart",
      });
      await expect(readFile(markerPath, "utf8")).resolves.toBe("2");
    } finally {
      if (previousMarker === undefined) delete process.env.STAGE1_DELAYED_READY_MARKER;
      else process.env.STAGE1_DELAYED_READY_MARKER = previousMarker;
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("bounds stderr capture and ignores worker stdout", async () => {
    const instance = host("stage1-noisy");
    const outcome = await instance.request("runtime");
    expect(outcome).toMatchObject({ kind: "engine-failure", failure: "runtime" });
    if (outcome.kind !== "engine-failure") throw new Error("Expected engine failure");
    expect(outcome.debugDetail?.length).toBeLessThanOrEqual(4096);
    expect(outcome.debugDetail).toContain("PRIVATE_STDERR_MARKER");
    expect(JSON.stringify(outcome)).not.toContain("PRIVATE_STDOUT_MARKER");
  });
});
