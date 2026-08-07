import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CanonicalSyntaxWorkerHost,
  type WorkerHostOptions,
} from "../../../src/validation/canonical-syntax/worker-host.js";

const fixture = (name: string): string => resolve(`tests/fixtures/workers/${name}.mjs`);
const hosts: CanonicalSyntaxWorkerHost[] = [];

function host(
  name: string,
  timeoutMs = 250,
  options: Partial<WorkerHostOptions> = {},
): CanonicalSyntaxWorkerHost {
  const instance = new CanonicalSyntaxWorkerHost({
    workerPath: fixture(name),
    startupTimeoutMs: 2_000,
    requestTimeoutMs: timeoutMs,
    ...options,
  });
  hosts.push(instance);
  return instance;
}

async function waitForFile(path: string, expected?: string): Promise<string> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try {
      const value = await readFile(path, "utf8");
      if (expected === undefined || value === expected) return value;
    } catch {
      // The worker may not have created its marker yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  throw new Error(`Timed out waiting for ${path}`);
}

async function withWorkerMarkers(
  prefix: string,
  run: (markers: { readonly launches: string; readonly requests: string }) => Promise<void>,
  delayReadyAfterFirst = false,
): Promise<void> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), prefix));
  const markers = {
    launches: join(temporaryDirectory, "launch-count"),
    requests: join(temporaryDirectory, "request-count"),
  };
  const previousLaunches = process.env.STAGE4_WORKER_LAUNCH_MARKER;
  const previousRequests = process.env.STAGE4_WORKER_REQUEST_MARKER;
  const previousDelay = process.env.STAGE4_DELAY_READY_AFTER_FIRST;
  process.env.STAGE4_WORKER_LAUNCH_MARKER = markers.launches;
  process.env.STAGE4_WORKER_REQUEST_MARKER = markers.requests;
  if (delayReadyAfterFirst) process.env.STAGE4_DELAY_READY_AFTER_FIRST = "1";
  else delete process.env.STAGE4_DELAY_READY_AFTER_FIRST;
  try {
    await run(markers);
  } finally {
    if (previousLaunches === undefined) delete process.env.STAGE4_WORKER_LAUNCH_MARKER;
    else process.env.STAGE4_WORKER_LAUNCH_MARKER = previousLaunches;
    if (previousRequests === undefined) delete process.env.STAGE4_WORKER_REQUEST_MARKER;
    else process.env.STAGE4_WORKER_REQUEST_MARKER = previousRequests;
    if (previousDelay === undefined) delete process.env.STAGE4_DELAY_READY_AFTER_FIRST;
    else process.env.STAGE4_DELAY_READY_AFTER_FIRST = previousDelay;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
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

  it("reuses one successfully initialized worker for sequential requests", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "stage1-worker-reuse-"));
    const markerPath = join(temporaryDirectory, "launch-count");
    const previousMarker = process.env.STAGE1_DELAYED_READY_MARKER;
    process.env.STAGE1_DELAYED_READY_MARKER = markerPath;
    try {
      const instance = host("stage1-delayed-ready");
      await expect(instance.request("first")).resolves.toMatchObject({ kind: "accepted" });
      await expect(instance.request("second")).resolves.toMatchObject({ kind: "accepted" });
      await expect(readFile(markerPath, "utf8")).resolves.toBe("1");
    } finally {
      if (previousMarker === undefined) delete process.env.STAGE1_DELAYED_READY_MARKER;
      else process.env.STAGE1_DELAYED_READY_MARKER = previousMarker;
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it("classifies initialization failure without exposing raw stderr in the message", async () => {
    const outcome = await host("stage1-initialization-failure").request("anything");
    expect(outcome).toMatchObject({
      kind: "engine-failure",
      failure: "initialization",
      message: "Canonical Mermaid parser failed to initialize",
      debugDetail: "PRIVATE_INIT_DETAIL",
    });
    if (outcome.kind !== "engine-failure" || outcome.failure !== "initialization") {
      throw new Error("Expected initialization failure");
    }
    expect(outcome.message).not.toContain("PRIVATE_INIT_DETAIL");
  });

  it("times out a request and starts a fresh worker for the next request", async () => {
    const instance = host("stage1-timeout", 75);
    await expect(instance.request("timeout")).resolves.toMatchObject({
      kind: "engine-failure",
      failure: "timeout",
      phase: "request",
      message: "Canonical Mermaid parser request timed out after 75ms",
    });
    await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
  });

  it("bounds a queued startup outage to one launch and recovers on demand at the fixed deadline", async () => {
    await withWorkerMarkers("stage4-startup-outage-", async ({ launches }) => {
      let now = 100;
      const instance = host("stage4-startup-outage", 40, {
        startupTimeoutMs: 300,
        restartSuppressionMs: 5_000,
        now: () => now,
      });
      const outcomes = await Promise.all(Array.from({ length: 8 }, (_, index) => instance.request(`request-${index}`)));
      expect(outcomes[0]).toMatchObject({
        kind: "engine-failure",
        failure: "timeout",
        phase: "startup",
        message: "Canonical Mermaid parser startup timed out after 300ms",
      });
      expect(outcomes.slice(1)).toEqual(Array.from({ length: 7 }, () => ({
        kind: "engine-failure",
        failure: "restart-suppressed",
        cause: { kind: "startup-failure", failure: "timeout" },
        message: "Canonical Mermaid parser restart is temporarily suppressed after a startup timeout",
      })));
      await expect(waitForFile(launches, "1")).resolves.toBe("1");

      await expect(instance.request("still-suppressed")).resolves.toEqual(outcomes[1]);
      await expect(readFile(launches, "utf8")).resolves.toBe("1");
      now = 5_100;
      await expect(instance.request("recovery-at-deadline")).resolves.toMatchObject({
        failure: "timeout",
        phase: "startup",
      });
      await expect(waitForFile(launches, "2")).resolves.toBe("2");
    });
  });

  it.each([
    [
      "stage1-initialization-failure",
      "initialization",
      "Canonical Mermaid parser restart is temporarily suppressed after a startup initialization failure",
    ],
    [
      "stage4-startup-crash",
      "crash",
      "Canonical Mermaid parser restart is temporarily suppressed after a startup process crash",
    ],
    [
      "stage4-startup-malformed",
      "protocol",
      "Canonical Mermaid parser restart is temporarily suppressed after a startup protocol failure",
    ],
  ] as const)("uses the exact bounded suppression message after %s", async (worker, failure, message) => {
    const instance = host(worker, 100, { startupTimeoutMs: 500 });
    const triggering = instance.request("trigger");
    const queued = instance.request("queued");
    await expect(triggering).resolves.toMatchObject({ kind: "engine-failure", failure });
    await expect(queued).resolves.toEqual({
      kind: "engine-failure",
      failure: "restart-suppressed",
      cause: { kind: "startup-failure", failure },
      message,
    });
  });

  it("opens fixed suppression after two consecutive request timeouts and starts fresh after every expiry", async () => {
    await withWorkerMarkers("stage4-request-outage-", async ({ launches }) => {
      let now = 200;
      const instance = host("stage4-controlled", 40, {
        restartSuppressionMs: 5_000,
        now: () => now,
      });
      const firstInterval = await Promise.all([
        instance.request("timeout"),
        instance.request("timeout"),
        instance.request("timeout"),
        instance.request("timeout"),
      ]);
      expect(firstInterval.slice(0, 2)).toEqual(Array.from({ length: 2 }, () => expect.objectContaining({
        kind: "engine-failure",
        failure: "timeout",
        phase: "request",
        message: "Canonical Mermaid parser request timed out after 40ms",
      })));
      expect(firstInterval.slice(2)).toEqual(Array.from({ length: 2 }, () => ({
        kind: "engine-failure",
        failure: "restart-suppressed",
        cause: { kind: "consecutive-request-timeouts" },
        message: "Canonical Mermaid parser restart is temporarily suppressed after consecutive request timeouts",
      })));
      await expect(waitForFile(launches, "2")).resolves.toBe("2");

      now = 5_199;
      await expect(instance.request("before-expiry")).resolves.toMatchObject({ failure: "restart-suppressed" });
      await expect(readFile(launches, "utf8")).resolves.toBe("2");
      now = 5_200;
      const secondInterval = await Promise.all([
        instance.request("timeout"),
        instance.request("timeout"),
        instance.request("timeout"),
      ]);
      expect(secondInterval.map((outcome) => outcome.kind === "engine-failure" ? outcome.failure : outcome.kind))
        .toEqual(["timeout", "timeout", "restart-suppressed"]);
      await expect(waitForFile(launches, "4")).resolves.toBe("4");

      now = 10_199;
      await expect(instance.request("second-before-expiry")).resolves.toMatchObject({ failure: "restart-suppressed" });
      await expect(readFile(launches, "utf8")).resolves.toBe("4");
      now = 10_200;
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout", phase: "request" });
      await expect(waitForFile(launches, "5")).resolves.toBe("5");
    });
  });

  it("rejects worker-forged host-only outcomes as protocol failures", async () => {
    for (const source of ["timeout", "suppressed", "detail"]) {
      const instance = host("stage4-host-only-outcome");
      const outcome = await instance.request(source);
      expect(outcome).toMatchObject({ kind: "engine-failure", failure: "protocol" });
      expect(JSON.stringify(outcome)).not.toMatch(/worker forged|PRIVATE_WORKER_DETAIL|restart-suppressed/);
      await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
      instance.dispose();
    }
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

  it("does not let queued cancellation hide two consecutive parser timeouts", async () => {
    await withWorkerMarkers("stage4-queued-cancel-", async ({ launches }) => {
      const instance = host("stage4-controlled", 50);
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      const secondTimeout = instance.request("timeout");
      const queuedController = new AbortController();
      const cancelled = instance.request("ok", queuedController.signal);
      queuedController.abort();
      await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
      await expect(secondTimeout).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("suppressed")).resolves.toMatchObject({
        failure: "restart-suppressed",
        cause: { kind: "consecutive-request-timeouts" },
      });
      await expect(waitForFile(launches, "2")).resolves.toBe("2");
    });
  });

  it("does not let startup-waiting cancellation clear an existing timeout streak", async () => {
    await withWorkerMarkers("stage4-startup-cancel-streak-", async ({ launches }) => {
      const instance = host("stage4-controlled", 50, { startupTimeoutMs: 500 });
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      const controller = new AbortController();
      const cancelled = instance.request("timeout", controller.signal);
      await expect(waitForFile(launches, "2")).resolves.toBe("2");
      controller.abort();
      await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });

      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("suppressed")).resolves.toMatchObject({ failure: "restart-suppressed" });
      await expect(waitForFile(launches, "3")).resolves.toBe("3");
    }, true);
  });

  it("active cancellation after send breaks the timeout streak without opening suppression", async () => {
    await withWorkerMarkers("stage4-active-cancel-", async ({ launches, requests }) => {
      const instance = host("stage4-controlled", 200);
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      const controller = new AbortController();
      const cancelled = instance.request("timeout", controller.signal);
      await expect(waitForFile(requests, "2")).resolves.toBe("2");
      controller.abort();
      await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
      await expect(waitForFile(launches, "4")).resolves.toBe("4");
    });
  });

  it("a different post-ready failure breaks the request-timeout streak", async () => {
    await withWorkerMarkers("stage4-runtime-breaks-streak-", async ({ launches }) => {
      const instance = host("stage4-controlled", 50);
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("runtime")).resolves.toMatchObject({ failure: "runtime" });
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
      await expect(waitForFile(launches, "4")).resolves.toBe("4");
    });
  });

  it.each(["ok", "syntax-error", "unsupported"])("treats a %s outcome as responsive recovery", async (source) => {
    await withWorkerMarkers(`stage4-responsive-${source}-`, async ({ launches }) => {
      const instance = host("stage4-controlled", 50);
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request(source)).resolves.toMatchObject({
        kind: source === "ok" ? "accepted" : source === "unsupported" ? "unsupported-type" : "syntax-error",
      });
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("ok")).resolves.toMatchObject({ kind: "accepted" });
      await expect(waitForFile(launches, "3")).resolves.toBe("3");
    });
  });

  it("keeps pre-abort distinct during suppression and ignores later abort after settlement", async () => {
    await withWorkerMarkers("stage4-suppression-abort-", async ({ launches }) => {
      const instance = host("stage4-controlled", 50);
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });
      await expect(instance.request("timeout")).resolves.toMatchObject({ failure: "timeout" });

      const preAborted = new AbortController();
      preAborted.abort();
      await expect(instance.request("pre-aborted", preAborted.signal)).rejects.toMatchObject({ name: "AbortError" });

      const later = new AbortController();
      const settled = instance.request("already-suppressed", later.signal);
      later.abort();
      await expect(settled).resolves.toMatchObject({ failure: "restart-suppressed" });
      await expect(waitForFile(launches, "2")).resolves.toBe("2");
    });
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

  it("validates only the initial monotonic clock reading and suppression interval", () => {
    expect(() => new CanonicalSyntaxWorkerHost({ restartSuppressionMs: 0 }))
      .toThrow("Canonical Mermaid parser restart suppression must be a finite positive number");
    expect(() => new CanonicalSyntaxWorkerHost({ restartSuppressionMs: Number.NaN }))
      .toThrow("Canonical Mermaid parser restart suppression must be a finite positive number");
    expect(() => new CanonicalSyntaxWorkerHost({ now: () => { throw new Error("private clock failure"); } }))
      .toThrow("Canonical Mermaid parser monotonic clock failed during initialization");
    expect(() => new CanonicalSyntaxWorkerHost({ now: () => Number.POSITIVE_INFINITY }))
      .toThrow("Canonical Mermaid parser monotonic clock must return a finite number");

    let readings = 0;
    const instance = host("stage1-timeout", 100, { now: () => { readings += 1; return 10; } });
    expect(readings).toBe(1);
    instance.dispose();
  });

  it("dispose rejects queued work, clears recovery, and leaves the host bounded", async () => {
    await withWorkerMarkers("stage4-dispose-", async () => {
      const instance = host("stage4-startup-outage", 500, { startupTimeoutMs: 500 });
      const first = instance.request("first");
      const second = instance.request("second");
      instance.dispose();
      await expect(first).rejects.toMatchObject({ name: "AbortError" });
      await expect(second).rejects.toMatchObject({ name: "AbortError" });
      await expect(instance.request("after-dispose")).resolves.toEqual({
        kind: "engine-failure",
        failure: "protocol",
        message: "Canonical Mermaid parser host is disposed",
      });
    });
  });

  it("bounds stderr capture and ignores worker stdout", async () => {
    const instance = host("stage1-noisy");
    const outcome = await instance.request("runtime");
    expect(outcome).toMatchObject({ kind: "engine-failure", failure: "runtime" });
    if (outcome.kind !== "engine-failure" || outcome.failure !== "runtime") {
      throw new Error("Expected runtime failure");
    }
    expect(outcome.debugDetail?.length).toBeLessThanOrEqual(4096);
    expect(outcome.debugDetail).toContain("PRIVATE_STDERR_MARKER");
    expect(JSON.stringify(outcome)).not.toContain("PRIVATE_STDOUT_MARKER");
  });
});
