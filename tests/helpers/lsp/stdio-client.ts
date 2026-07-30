import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { resolve } from "node:path";

interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

export interface JsonRpcNotification {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: unknown;
}

export interface StdioLspClientOptions {
  readonly arguments?: readonly string[];
  readonly entry?: string;
}

export interface ChildExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

const MAX_NOTIFICATION_HISTORY = 256;

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

interface NotificationWaiter {
  readonly method: string;
  readonly predicate: (params: unknown) => boolean;
  readonly resolve: (params: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export class LspResponseError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = "LspResponseError";
  }
}

export class StdioLspClient {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #pending = new Map<number, PendingRequest>();
  readonly #notifications: JsonRpcNotification[] = [];
  readonly #notificationHistory: JsonRpcNotification[] = [];
  readonly #waiters = new Set<NotificationWaiter>();
  #nextId = 1;
  #stdout = Buffer.alloc(0);
  #stderr = "";
  #closed = false;
  #failure: Error | undefined;

  constructor(options: StdioLspClientOptions = {}) {
    const arguments_ = options.arguments ?? ["--stdio"];
    const entry = options.entry ?? resolve("dist/lsp/main.js");
    this.#child = spawn(process.execPath, [entry, ...arguments_], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.#child.stdout.on("data", (chunk: Buffer) => {
      this.#stdout = Buffer.concat([this.#stdout, chunk]);
      this.#parseMessages();
    });
    this.#child.stderr.setEncoding("utf8");
    this.#child.stderr.on("data", (chunk: string) => {
      this.#stderr = `${this.#stderr}${chunk}`.slice(-8_192);
    });
    this.#child.on("exit", (code, signal) => {
      this.#closed = true;
      const error = new Error(`Language server exited before completing a request (${code ?? signal})`);
      for (const pending of this.#pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      this.#pending.clear();
      for (const waiter of this.#waiters) {
        clearTimeout(waiter.timer);
        waiter.reject(error);
      }
      this.#waiters.clear();
    });
  }

  get stderr(): string {
    return this.#stderr;
  }

  get pid(): number | undefined {
    return this.#child.pid;
  }

  get notificationHistory(): readonly JsonRpcNotification[] {
    return Object.freeze([...this.#notificationHistory]);
  }

  request<T>(method: string, params?: unknown, timeoutMs = 15_000): Promise<T> {
    if (this.#failure) return Promise.reject(this.#failure);
    const id = this.#nextId++;
    return new Promise<T>((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timed out waiting for LSP response to ${method}; stderr=${this.#stderr}`));
      }, timeoutMs);
      this.#pending.set(id, {
        resolve: (value) => { resolvePromise(value as T); },
        reject,
        timer,
      });
      this.#send({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
    });
  }

  notify(method: string, params?: unknown): void {
    if (this.#failure) throw this.#failure;
    this.#send({ jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) });
  }

  waitForNotification<T>(
    method: string,
    predicate: (params: T) => boolean = () => true,
    timeoutMs = 15_000,
  ): Promise<T> {
    if (this.#failure) return Promise.reject(this.#failure);
    const existingIndex = this.#notifications.findIndex((notification) =>
      notification.method === method && predicate(notification.params as T));
    if (existingIndex !== -1) {
      const [notification] = this.#notifications.splice(existingIndex, 1);
      return Promise.resolve(notification!.params as T);
    }
    return new Promise<T>((resolvePromise, reject) => {
      const waiter: NotificationWaiter = {
        method,
        predicate: (params) => predicate(params as T),
        resolve: (params) => { resolvePromise(params as T); },
        reject,
        timer: setTimeout(() => {
          this.#waiters.delete(waiter);
          reject(new Error(`Timed out waiting for LSP notification ${method}; stderr=${this.#stderr}`));
        }, timeoutMs),
      };
      this.#waiters.add(waiter);
    });
  }

  async shutdown(): Promise<ChildExit> {
    if (this.#closed) {
      return { code: this.#child.exitCode, signal: this.#child.signalCode };
    }
    await this.request("shutdown", null);
    this.notify("exit");
    return await this.waitForExit(5_000);
  }

  async dispose(): Promise<void> {
    if (this.#closed) return;
    this.#child.kill("SIGKILL");
    await this.waitForExit(5_000);
  }

  waitForExit(timeoutMs: number): Promise<ChildExit> {
    if (this.#closed) return Promise.resolve({ code: this.#child.exitCode, signal: this.#child.signalCode });
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out waiting for language server exit")), timeoutMs);
      this.#child.once("exit", (code, signal) => {
        clearTimeout(timer);
        resolvePromise({ code, signal });
      });
    });
  }

  #send(message: object): void {
    if (this.#closed) throw new Error("Language server is closed");
    const body = Buffer.from(JSON.stringify(message), "utf8");
    this.#child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.#child.stdin.write(body);
  }

  #parseMessages(): void {
    while (true) {
      const headerEnd = this.#stdout.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;
      const header = this.#stdout.subarray(0, headerEnd).toString("ascii");
      const match = /(?:^|\r\n)Content-Length: (\d+)(?:\r\n|$)/i.exec(header);
      if (!match) throw new Error(`Malformed LSP header: ${header}`);
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (this.#stdout.length < bodyStart + length) return;
      const body = this.#stdout.subarray(bodyStart, bodyStart + length).toString("utf8");
      this.#stdout = this.#stdout.subarray(bodyStart + length);
      this.#handleMessage(JSON.parse(body) as JsonRpcResponse | JsonRpcNotification);
    }
  }

  #handleMessage(message: JsonRpcResponse | JsonRpcNotification): void {
    if ("id" in message) {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new LspResponseError(message.error.code, message.error.message));
      else pending.resolve(message.result);
      return;
    }
    if (this.#notificationHistory.length >= MAX_NOTIFICATION_HISTORY) {
      this.#fail(new Error(`LSP notification history exceeded ${MAX_NOTIFICATION_HISTORY} entries`));
      return;
    }
    this.#notificationHistory.push(message);
    for (const waiter of this.#waiters) {
      if (waiter.method === message.method && waiter.predicate(message.params)) {
        this.#waiters.delete(waiter);
        clearTimeout(waiter.timer);
        waiter.resolve(message.params);
        return;
      }
    }
    this.#notifications.push(message);
  }

  #fail(error: Error): void {
    this.#failure = error;
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
    for (const waiter of this.#waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.#waiters.clear();
    if (!this.#closed) this.#child.kill("SIGKILL");
  }
}
