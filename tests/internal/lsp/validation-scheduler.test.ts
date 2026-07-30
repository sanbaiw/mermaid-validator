import { TextDocument } from "vscode-languageserver-textdocument";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  materializeRuleConfiguration,
  type DocumentSnapshot,
  type ValidationResult,
} from "../../../src/validation/index.js";
import {
  createValidationScheduler,
  type PublishedDiagnostics,
} from "../../../src/lsp/validation-scheduler.js";

const rules = materializeRuleConfiguration(Object.freeze({}));

function validResult(snapshot: DocumentSnapshot): ValidationResult {
  return {
    documentUri: snapshot.uri,
    ...(snapshot.version === undefined ? {} : { documentVersion: snapshot.version }),
    diagramCount: 1,
    valid: true,
    findings: [],
  };
}

function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
});

describe("version-aware validation scheduler", () => {
  it("coalesces pending work per URI and preserves the newest version", async () => {
    vi.useFakeTimers();
    const seen: DocumentSnapshot[] = [];
    const publications: PublishedDiagnostics[] = [];
    const scheduler = createValidationScheduler(150, {
      validate: vi.fn(async (snapshot) => { seen.push(snapshot); return validResult(snapshot); }),
      publishDiagnostics: async (publication) => { publications.push(publication); },
    });
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 1, "old"), rules);
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 2, "new"), rules);
    await vi.advanceTimersByTimeAsync(150);
    await flush();
    expect(seen.map(({ text, version }) => [text, version])).toEqual([["new", 2]]);
    expect(publications).toEqual([{ uri: "untitled:test", version: 2, diagnostics: [] }]);
    expect(scheduler.current("untitled:test")?.snapshot.version).toBe(2);
  });

  it("aborts active work and suppresses a validator that ignores cancellation", async () => {
    vi.useFakeTimers();
    const first = deferred<ValidationResult>();
    const second = deferred<ValidationResult>();
    const signals: AbortSignal[] = [];
    let calls = 0;
    const publications: PublishedDiagnostics[] = [];
    const scheduler = createValidationScheduler(0, {
      validate: vi.fn(async (snapshot, options) => {
        signals.push(options.signal!);
        return await (++calls === 1 ? first.promise : second.promise);
      }),
      publishDiagnostics: async (publication) => { publications.push(publication); },
    });
    const v1 = TextDocument.create("untitled:test", "mermaid", 1, "old");
    const v2 = TextDocument.create("untitled:test", "mermaid", 2, "new");
    scheduler.schedule(v1, rules);
    await vi.runOnlyPendingTimersAsync();
    scheduler.schedule(v2, rules);
    expect(signals[0]?.aborted).toBe(true);
    await vi.runOnlyPendingTimersAsync();
    first.resolve(validResult({ uri: v1.uri, languageId: "mermaid", text: v1.getText(), version: 1 }));
    second.resolve(validResult({ uri: v2.uri, languageId: "mermaid", text: v2.getText(), version: 2 }));
    await flush();
    expect(publications.map(({ version }) => version)).toEqual([2]);
  });

  it("copies a mutable document at notification time", async () => {
    vi.useFakeTimers();
    let text = "before";
    let version = 1;
    const seen: DocumentSnapshot[] = [];
    const mutable = {
      uri: "virtual:test",
      languageId: "mermaid",
      get version() { return version; },
      getText: () => text,
    } as TextDocument;
    const scheduler = createValidationScheduler(10, {
      validate: vi.fn(async (snapshot) => { seen.push(snapshot); return validResult(snapshot); }),
      publishDiagnostics: async () => {},
    });
    scheduler.schedule(mutable, rules);
    text = "after";
    version = 2;
    await vi.advanceTimersByTimeAsync(10);
    expect(seen).toMatchObject([{ text: "before", version: 1 }]);
  });

  it("does not install stale cache while diagnostic publication is pending", async () => {
    vi.useFakeTimers();
    const publication = deferred<void>();
    let publishCalls = 0;
    const scheduler = createValidationScheduler(0, {
      validate: vi.fn(async (snapshot) => validResult(snapshot)),
      publishDiagnostics: async () => {
        if (++publishCalls === 1) await publication.promise;
      },
    });
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 1, "old"), rules);
    await vi.runOnlyPendingTimersAsync();
    await flush();
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 2, "new"), rules);
    publication.resolve();
    await flush();
    expect(scheduler.current("untitled:test")).toBeUndefined();
    await vi.runOnlyPendingTimersAsync();
    await flush();
    expect(scheduler.current("untitled:test")?.snapshot.version).toBe(2);
  });

  it("keeps URIs independent and close clears diagnostics and suppresses late work", async () => {
    vi.useFakeTimers();
    const pending = deferred<ValidationResult>();
    const publications: PublishedDiagnostics[] = [];
    const scheduler = createValidationScheduler(0, {
      validate: vi.fn(async (snapshot) => snapshot.uri === "untitled:a"
        ? await pending.promise
        : validResult(snapshot)),
      publishDiagnostics: async (publication) => { publications.push(publication); },
    });
    scheduler.schedule(TextDocument.create("untitled:a", "mermaid", 1, "a"), rules);
    scheduler.schedule(TextDocument.create("untitled:b", "mermaid", 4, "b"), rules);
    await vi.runOnlyPendingTimersAsync();
    scheduler.close("untitled:a", 1);
    pending.resolve(validResult({ uri: "untitled:a", languageId: "mermaid", text: "a", version: 1 }));
    await flush();
    expect(publications.map(({ uri, version, diagnostics }) => [uri, version, diagnostics.length])).toEqual([
      ["untitled:b", 4, 0],
      ["untitled:a", 1, 0],
    ]);
    expect(scheduler.current("untitled:b")?.snapshot.version).toBe(4);
    expect(scheduler.current("untitled:a")).toBeUndefined();
  });

  it("bounds unexpected failures, clears diagnostics, and remains usable", async () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    const publications: PublishedDiagnostics[] = [];
    let calls = 0;
    const scheduler = createValidationScheduler(0, {
      validate: vi.fn(async (snapshot) => {
        if (++calls === 1) throw new Error("PRIVATE STACK DETAIL");
        return validResult(snapshot);
      }),
      publishDiagnostics: async (publication) => { publications.push(publication); },
      logger: (message) => { logs.push(message); },
    });
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 1, "bad"), rules);
    await vi.runOnlyPendingTimersAsync();
    await flush();
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 2, "good"), rules);
    await vi.runOnlyPendingTimersAsync();
    await flush();
    expect(logs).toEqual(["Language server validation failed\n"]);
    expect(JSON.stringify(logs)).not.toContain("PRIVATE");
    expect(publications.map(({ version }) => version)).toEqual([1, 2]);
    expect(scheduler.current("untitled:test")?.snapshot.version).toBe(2);
  });

  it("dispose cancels timers and active work without publishing", async () => {
    vi.useFakeTimers();
    const publications: PublishedDiagnostics[] = [];
    const scheduler = createValidationScheduler(50, {
      validate: vi.fn(async (snapshot) => validResult(snapshot)),
      publishDiagnostics: async (publication) => { publications.push(publication); },
    });
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 1, "text"), rules);
    scheduler.dispose();
    await vi.runAllTimersAsync();
    expect(publications).toEqual([]);
    expect(scheduler.current("untitled:test")).toBeUndefined();
  });

  it("contains rejected success and clearing publications without an unhandled rejection", async () => {
    vi.useFakeTimers();
    const logs: string[] = [];
    const scheduler = createValidationScheduler(0, {
      validate: vi.fn(async (snapshot) => validResult(snapshot)),
      publishDiagnostics: async () => { throw new Error("PRIVATE SEND DETAIL"); },
      logger: (message) => { logs.push(message); },
    });
    scheduler.schedule(TextDocument.create("untitled:test", "mermaid", 1, "text"), rules);
    await vi.runOnlyPendingTimersAsync();
    await flush();
    expect(logs).toEqual(["Language server validation failed\n"]);
    expect(scheduler.current("untitled:test")).toBeUndefined();
  });

  it("contains a rejected close publication", async () => {
    const logs: string[] = [];
    const scheduler = createValidationScheduler(0, {
      publishDiagnostics: async () => { throw new Error("PRIVATE CLOSE DETAIL"); },
      logger: (message) => { logs.push(message); },
    });
    scheduler.close("untitled:test", 1);
    await flush();
    expect(logs).toEqual(["Language server validation failed\n"]);
  });
});
