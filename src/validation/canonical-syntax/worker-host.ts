import { fork, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sep } from "node:path";
import type { EngineFailure, SyntaxOutcome, WorkerMessage } from "./protocol.js";

const STDERR_LIMIT = 4_096;
const DEFAULT_TIMEOUT_MS = 10_000;

interface PendingRequest {
  readonly id: number;
  readonly source: string;
  readonly signal?: AbortSignal;
  readonly resolve: (outcome: SyntaxOutcome) => void;
  readonly reject: (error: Error) => void;
  abortHandler?: () => void;
}

interface ActiveRequest {
  readonly request: PendingRequest;
  readonly timer: NodeJS.Timeout;
}

interface WorkerState {
  readonly child: ChildProcess;
  ready: boolean;
  stderrTail: string;
  startupTimer: NodeJS.Timeout;
}

export interface WorkerHostOptions {
  readonly workerPath?: string;
  readonly startupTimeoutMs?: number;
  readonly requestTimeoutMs?: number;
}

function abortError(): Error {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function engineFailure(failure: EngineFailure, message: string, debugDetail?: string): SyntaxOutcome {
  return {
    kind: "engine-failure",
    failure,
    message,
    ...(debugDetail ? { debugDetail } : {}),
  };
}

function isSyntaxOutcome(value: unknown): value is SyntaxOutcome {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const outcome = value as Record<string, unknown>;
  if (outcome.kind === "accepted") {
    return ["flowchart", "sequence", "pie", "class", "state"].includes(String(outcome.diagramType))
      && typeof outcome.engineVersion === "string";
  }
  if (outcome.kind === "syntax-error") {
    return typeof outcome.message === "string"
      && ["approximate", "document"].includes(String(outcome.locationPrecision))
      && typeof outcome.engineVersion === "string";
  }
  if (outcome.kind === "unsupported-type") {
    return typeof outcome.diagramType === "string"
      && typeof outcome.message === "string"
      && typeof outcome.engineVersion === "string";
  }
  return outcome.kind === "engine-failure"
    && ["initialization", "timeout", "runtime", "crash", "protocol"].includes(String(outcome.failure))
    && typeof outcome.message === "string"
    && outcome.debugDetail === undefined;
}

function isWorkerMessage(value: unknown): value is WorkerMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (message.type === "ready") return Object.keys(message).length === 1;
  if (message.type === "initialization-failed") return typeof message.message === "string";
  return message.type === "response"
    && Number.isSafeInteger(message.requestId)
    && isSyntaxOutcome(message.outcome);
}

function unrefWorker(child: ChildProcess): void {
  child.unref();
  child.channel?.unref();
  (child.stderr as (NodeJS.ReadableStream & { unref?: () => void }) | null)?.unref?.();
}

function refWorker(child: ChildProcess): void {
  child.ref();
  child.channel?.ref();
  (child.stderr as (NodeJS.ReadableStream & { ref?: () => void }) | null)?.ref?.();
}

export class CanonicalSyntaxWorkerHost {
  readonly #workerPath: string;
  readonly #startupTimeoutMs: number;
  readonly #requestTimeoutMs: number;
  #nextRequestId = 1;
  #queue: PendingRequest[] = [];
  #active: ActiveRequest | undefined;
  #worker: WorkerState | undefined;
  #disposed = false;

  constructor(options: WorkerHostOptions = {}) {
    const siblingWorker = fileURLToPath(new URL("./worker-entry.js", import.meta.url));
    this.#workerPath = options.workerPath
      ?? siblingWorker.replace(`${sep}src${sep}`, `${sep}dist${sep}`);
    this.#startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  request(source: string, signal?: AbortSignal): Promise<SyntaxOutcome> {
    if (this.#disposed) return Promise.resolve(engineFailure("protocol", "Canonical Mermaid parser host is disposed"));
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const request: PendingRequest = {
        id: this.#nextRequestId++,
        source,
        ...(signal === undefined ? {} : { signal }),
        resolve,
        reject,
      };
      request.abortHandler = () => this.#abort(request);
      signal?.addEventListener("abort", request.abortHandler, { once: true });
      this.#queue.push(request);
      this.#pump();
    });
  }

  dispose(): void {
    this.#disposed = true;
    const error = abortError();
    for (const request of this.#queue.splice(0)) {
      request.signal?.removeEventListener("abort", request.abortHandler!);
      request.reject(error);
    }
    if (this.#active) {
      const { request, timer } = this.#active;
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", request.abortHandler!);
      request.reject(error);
      this.#active = undefined;
    }
    this.#discardWorker(true);
  }

  #pump(): void {
    if (this.#disposed || this.#active || this.#queue.length === 0) return;
    if (!this.#worker) {
      this.#startWorker();
      return;
    }
    if (!this.#worker.ready) return;

    const request = this.#queue.shift()!;
    this.#worker.stderrTail = "";
    refWorker(this.#worker.child);
    const timer = setTimeout(() => {
      this.#finishActive(engineFailure(
        "timeout",
        `Canonical Mermaid parser timed out after ${this.#requestTimeoutMs}ms`,
        this.#worker?.stderrTail,
      ), true);
    }, this.#requestTimeoutMs);
    this.#active = { request, timer };
    this.#worker.child.send({ type: "validate", requestId: request.id, source: request.source }, (error) => {
      if (error && this.#active?.request === request) {
        this.#finishActive(engineFailure("protocol", "Canonical Mermaid parser IPC send failed", this.#worker?.stderrTail), true);
      }
    });
  }

  #startWorker(): void {
    let child: ChildProcess;
    try {
      child = fork(this.#workerPath, [], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
    } catch {
      this.#settleQueuedFailure(engineFailure("initialization", "Canonical Mermaid parser failed to initialize"));
      return;
    }

    const state: WorkerState = {
      child,
      ready: false,
      stderrTail: "",
      startupTimer: setTimeout(() => {
        if (this.#worker !== state || state.ready) return;
        this.#settleQueuedFailure(engineFailure(
          "timeout",
          `Canonical Mermaid parser timed out after ${this.#startupTimeoutMs}ms`,
          state.stderrTail,
        ));
        this.#discardWorker(true);
        this.#pump();
      }, this.#startupTimeoutMs),
    };
    this.#worker = state;

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      state.stderrTail = `${state.stderrTail}${chunk}`.slice(-STDERR_LIMIT);
    });
    child.on("message", (message: unknown) => this.#onMessage(state, message));
    child.on("error", () => this.#onWorkerExit(state));
    child.on("exit", () => this.#onWorkerExit(state));
    child.on("disconnect", () => {
      if (this.#worker === state && !state.child.killed) this.#onWorkerExit(state);
    });
    refWorker(child);
  }

  #onMessage(state: WorkerState, value: unknown): void {
    if (this.#worker !== state) return;
    if (!isWorkerMessage(value)) {
      this.#protocolFailure("Canonical Mermaid parser returned a malformed IPC message");
      return;
    }
    if (!state.ready) {
      if (value.type === "ready") {
        clearTimeout(state.startupTimer);
        state.ready = true;
        this.#pump();
        return;
      }
      if (value.type === "initialization-failed") {
        this.#settleQueuedFailure(engineFailure("initialization", "Canonical Mermaid parser failed to initialize", state.stderrTail));
        this.#discardWorker(true);
        this.#pump();
        return;
      }
      this.#protocolFailure("Canonical Mermaid parser violated the startup protocol");
      return;
    }

    if (value.type !== "response" || !this.#active || value.requestId !== this.#active.request.id) {
      this.#protocolFailure("Canonical Mermaid parser returned a mismatched response");
      return;
    }
    const outcome = value.outcome.kind === "engine-failure"
      ? { ...value.outcome, ...(state.stderrTail ? { debugDetail: state.stderrTail } : {}) }
      : value.outcome;
    this.#finishActive(outcome, outcome.kind === "engine-failure");
  }

  #onWorkerExit(state: WorkerState): void {
    if (this.#worker !== state) return;
    if (this.#active) {
      this.#finishActive(engineFailure("crash", "Canonical Mermaid parser process crashed", state.stderrTail), true);
    } else {
      this.#settleQueuedFailure(engineFailure("crash", "Canonical Mermaid parser process crashed", state.stderrTail));
      this.#discardWorker(false);
      this.#pump();
    }
  }

  #protocolFailure(message: string): void {
    const outcome = engineFailure("protocol", message, this.#worker?.stderrTail);
    if (this.#active) {
      this.#finishActive(outcome, true);
    } else {
      this.#settleQueuedFailure(outcome);
      this.#discardWorker(true);
      this.#pump();
    }
  }

  #settleQueuedFailure(outcome: SyntaxOutcome): void {
    const request = this.#queue.shift();
    if (!request) return;
    request.signal?.removeEventListener("abort", request.abortHandler!);
    request.resolve(outcome);
  }

  #finishActive(outcome: SyntaxOutcome, discard: boolean): void {
    const active = this.#active;
    if (!active) return;
    this.#active = undefined;
    clearTimeout(active.timer);
    active.request.signal?.removeEventListener("abort", active.request.abortHandler!);
    active.request.resolve(outcome);
    if (discard) this.#discardWorker(true);
    else if (this.#worker) unrefWorker(this.#worker.child);
    this.#pump();
  }

  #abort(request: PendingRequest): void {
    const queuedIndex = this.#queue.indexOf(request);
    if (queuedIndex !== -1) {
      this.#queue.splice(queuedIndex, 1);
      request.signal?.removeEventListener("abort", request.abortHandler!);
      request.reject(abortError());
      if (this.#queue.length === 0 && !this.#active && this.#worker && !this.#worker.ready) {
        this.#discardWorker(true);
      }
      return;
    }
    if (this.#active?.request !== request) return;
    clearTimeout(this.#active.timer);
    this.#active = undefined;
    request.signal?.removeEventListener("abort", request.abortHandler!);
    request.reject(abortError());
    this.#discardWorker(true);
    this.#pump();
  }

  #discardWorker(kill: boolean): void {
    const state = this.#worker;
    if (!state) return;
    this.#worker = undefined;
    clearTimeout(state.startupTimer);
    state.child.removeAllListeners();
    state.child.stderr?.removeAllListeners();
    state.child.stderr?.destroy();
    if (state.child.connected) state.child.disconnect();
    if (kill && !state.child.killed) state.child.kill("SIGKILL");
  }
}

const defaultHost = new CanonicalSyntaxWorkerHost();

export async function requestCanonicalSyntax(source: string, signal?: AbortSignal): Promise<SyntaxOutcome> {
  return await defaultHost.request(source, signal);
}
