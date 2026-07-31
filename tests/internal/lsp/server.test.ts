import {
  ResponseError,
  type CancellationToken,
  type CodeAction,
  type CodeActionParams,
  type Connection,
  type InitializeParams,
  type InitializeResult,
  type TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { describe, expect, it, vi } from "vitest";
import {
  planDocumentFixes,
  type DocumentFixPlan,
  type DocumentFixStatus,
  type Finding,
  type ValidationResult,
} from "../../../src/validation/index.js";
import { createLanguageServer, type LanguageServerDependencies } from "../../../src/lsp/server.js";

const disposable = { dispose(): void {} };
const token: CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => disposable,
};

class FakeConnection {
  initialize?: (params: InitializeParams) => InitializeResult;
  codeAction?: (params: CodeActionParams, token: CancellationToken) => Promise<CodeAction[]>;
  shutdown?: () => void;
  readonly diagnostics: unknown[] = [];
  readonly applyEdits: unknown[] = [];
  readonly registrations: string[] = [];
  listened = false;

  asConnection(): Connection {
    return {
      onInitialize: (handler: unknown) => {
        this.registrations.push("initialize");
        this.initialize = handler as (params: InitializeParams) => InitializeResult;
        return disposable;
      },
      onCodeAction: (handler: unknown) => {
        this.registrations.push("codeAction");
        this.codeAction = handler as (params: CodeActionParams, token: CancellationToken) => Promise<CodeAction[]>;
        return disposable;
      },
      onShutdown: (handler: unknown) => {
        this.registrations.push("shutdown");
        this.shutdown = handler as () => void;
        return disposable;
      },
      sendDiagnostics: async (params: unknown) => { this.diagnostics.push(params); },
      workspace: {
        applyEdit: async (params: unknown) => {
          this.applyEdits.push(params);
          return { applied: true };
        },
      },
      listen: () => { this.listened = true; },
    } as unknown as Connection;
  }
}

class FakeDocuments {
  readonly documents = new Map<string, TextDocument>();
  change?: (event: { readonly document: TextDocument }) => void;
  close?: (event: { readonly document: TextDocument }) => void;
  listened = false;

  asDocuments(): TextDocuments<TextDocument> {
    return {
      onDidChangeContent: (listener: unknown) => {
        this.change = listener as (event: { readonly document: TextDocument }) => void;
        return disposable;
      },
      onDidClose: (listener: unknown) => {
        this.close = listener as (event: { readonly document: TextDocument }) => void;
        return disposable;
      },
      get: (uri: string) => this.documents.get(uri),
      listen: () => { this.listened = true; return disposable; },
    } as unknown as TextDocuments<TextDocument>;
  }

  set(document: TextDocument): void {
    this.documents.set(document.uri, document);
    this.change?.({ document });
  }

  closeDocument(uri: string): void {
    const document = this.documents.get(uri);
    if (!document) return;
    this.documents.delete(uri);
    this.close?.({ document });
  }
}

function initializeParams(
  capable: boolean | InitializeParams["capabilities"] = true,
  initializationOptions: unknown = { debounceMs: 0 },
): InitializeParams {
  const capabilities = typeof capable === "boolean"
    ? (capable ? {
        workspace: { workspaceEdit: { documentChanges: true } },
        textDocument: {
          codeAction: {
            codeActionLiteralSupport: { codeActionKind: { valueSet: ["quickfix"] } },
          },
        },
      } : {})
    : capable;
  return {
    processId: null,
    rootUri: null,
    capabilities,
    initializationOptions,
  };
}

function cancellableToken(): { readonly token: CancellationToken; readonly cancel: () => void } {
  let requested = false;
  let listener: (() => void) | undefined;
  return {
    token: {
      get isCancellationRequested() { return requested; },
      onCancellationRequested: (handler) => {
        listener = () => { handler(undefined); };
        return { dispose: () => { listener = undefined; } };
      },
    },
    cancel: () => {
      requested = true;
      listener?.();
    },
  };
}

async function waitForScheduler(): Promise<void> {
  await new Promise((resolveWait) => setTimeout(resolveWait, 10));
}

function fixableFinding(
  code: string,
  startOffset: number,
  endOffset: number,
  message = `Fix ${code}`,
): Finding {
  return {
    code,
    severity: "warning",
    message,
    source: "rule",
    locationPrecision: "exact",
    span: { startOffset, endOffset },
    fixes: [{ span: { startOffset, endOffset }, newText: "" }],
  };
}

interface FixHarness {
  readonly connection: FakeConnection;
  readonly documents: FakeDocuments;
  readonly document: TextDocument;
  readonly result: ValidationResult;
  readonly params: CodeActionParams;
  readonly stderr: { readonly write: ReturnType<typeof vi.fn> };
}

async function createFixHarness(options: {
  readonly uri?: string;
  readonly version?: number;
  readonly text?: string;
  readonly findings?: readonly Finding[];
  readonly planFixes?: LanguageServerDependencies["planFixes"];
} = {}): Promise<FixHarness> {
  const uri = options.uri ?? "untitled:matrix";
  const version = options.version ?? 1;
  const text = options.text ?? "abcd";
  const findings = options.findings ?? [fixableFinding("example/fix", 0, 1)];
  const result: ValidationResult = {
    documentUri: uri,
    documentVersion: version,
    diagramCount: 1,
    valid: true,
    findings,
  };
  const connection = new FakeConnection();
  const documents = new FakeDocuments();
  const stderr = { write: vi.fn(() => true) };
  createLanguageServer(connection.asConnection(), documents.asDocuments(), {
    validate: vi.fn(async (snapshot) => ({
      ...result,
      documentUri: snapshot.uri,
      documentVersion: snapshot.version,
    })),
    ...(options.planFixes === undefined ? {} : { planFixes: options.planFixes }),
    stderr,
  });
  connection.initialize!(initializeParams());
  const document = TextDocument.create(uri, "mermaid", version, text);
  documents.set(document);
  await waitForScheduler();
  const publication = connection.diagnostics[0] as {
    readonly diagnostics: CodeActionParams["context"]["diagnostics"];
  };
  return {
    connection,
    documents,
    document,
    result,
    params: {
      textDocument: { uri },
      range: publication.diagnostics[0]!.range,
      context: { diagnostics: publication.diagnostics },
    },
    stderr,
  };
}

function changedPlan(result: ValidationResult, edits = [{
  span: { startOffset: 0, endOffset: 1 }, newText: "",
}]): DocumentFixPlan {
  return {
    status: "changed",
    edits,
    originalResult: result,
    output: "changed",
    proposedResult: { ...result, findings: [] },
  };
}

function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function applyActionEdits(text: string, action: CodeAction): string {
  const document = TextDocument.create("untitled:apply", "mermaid", 1, text);
  const changes = action.edit?.documentChanges?.[0];
  if (!changes || !("edits" in changes)) throw new Error("Expected one TextDocumentEdit");
  const edits = [...changes.edits].sort((left, right) =>
    document.offsetAt(right.range.start) - document.offsetAt(left.range.start));
  let output = text;
  for (const edit of edits) {
    if (!("newText" in edit)) throw new Error("Expected a plain protocol TextEdit");
    const start = document.offsetAt(edit.range.start);
    const end = document.offsetAt(edit.range.end);
    output = `${output.slice(0, start)}${edit.newText}${output.slice(end)}`;
  }
  return output;
}

describe("language server handler wiring", () => {
  it("registers every handler before listen and advertises only negotiated capabilities", () => {
    const connection = new FakeConnection();
    const documents = new FakeDocuments();
    const server = createLanguageServer(connection.asConnection(), documents.asDocuments());
    expect(connection.registrations).toEqual(["initialize", "codeAction", "shutdown"]);
    server.listen();
    expect(documents.listened).toBe(true);
    expect(connection.listened).toBe(true);
    expect(connection.initialize!(initializeParams())).toEqual({
      capabilities: {
        positionEncoding: "utf-16",
        textDocumentSync: { openClose: true, change: 2 },
        codeActionProvider: { codeActionKinds: ["quickfix"] },
      },
      serverInfo: { name: "mermaid-validator", version: "0.3.0" },
    });
  });

  it.each([
    ["only another literal kind", {
      workspace: { workspaceEdit: { documentChanges: true } },
      textDocument: {
        codeAction: { codeActionLiteralSupport: { codeActionKind: { valueSet: ["refactor"] } } },
      },
    }],
    ["no literal support", { workspace: { workspaceEdit: { documentChanges: true } } }],
    ["no versioned document changes", {
      workspace: { workspaceEdit: { documentChanges: false } },
      textDocument: {
        codeAction: { codeActionLiteralSupport: { codeActionKind: { valueSet: ["quickfix"] } } },
      },
    }],
  ])("does not advertise or return Quick Fixes with %s", async (_label, capabilities) => {
    const connection = new FakeConnection();
    createLanguageServer(connection.asConnection(), new FakeDocuments().asDocuments());
    const initialized = connection.initialize!(initializeParams(capabilities));
    expect(initialized.capabilities).not.toHaveProperty("codeActionProvider");
    await expect(connection.codeAction!({
      textDocument: { uri: "untitled:none" },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [] },
    }, token)).resolves.toEqual([]);
  });

  it("constructs an official invalid-params response without raw input", () => {
    const connection = new FakeConnection();
    createLanguageServer(connection.asConnection(), new FakeDocuments().asDocuments());
    expect(() => connection.initialize!(initializeParams(false, { private: "secret" })))
      .toThrow(ResponseError);
    try {
      connection.initialize!(initializeParams(false, { private: "secret" }));
    } catch (error) {
      expect(error).toMatchObject({ code: -32602, message: "Unknown initialization option: private" });
      expect(JSON.stringify(error)).not.toContain("secret");
    }
  });

  it("returns one planner-backed versioned action and suppresses non-changed plans", async () => {
    const connection = new FakeConnection();
    const documents = new FakeDocuments();
    const result: ValidationResult = {
      documentUri: "untitled:test",
      documentVersion: 3,
      diagramCount: 1,
      valid: true,
      findings: [{
        code: "example/fix",
        severity: "warning",
        message: "Fix me",
        source: "rule",
        locationPrecision: "exact",
        span: { startOffset: 0, endOffset: 1 },
        fixes: [{ span: { startOffset: 0, endOffset: 1 }, newText: "" }],
      }],
    };
    let plan: DocumentFixPlan = {
      status: "changed",
      edits: [{ span: { startOffset: 0, endOffset: 1 }, newText: "" }],
      originalResult: result,
      output: "bc",
      proposedResult: { ...result, findings: [] },
    };
    createLanguageServer(connection.asConnection(), documents.asDocuments(), {
      validate: vi.fn(async () => result),
      planFixes: vi.fn(async () => plan),
    });
    connection.initialize!(initializeParams());
    const document = TextDocument.create("untitled:test", "mermaid", 3, "abc");
    documents.set(document);
    await waitForScheduler();
    const publication = connection.diagnostics[0] as { readonly diagnostics: CodeActionParams["context"]["diagnostics"] };
    const params: CodeActionParams = {
      textDocument: { uri: document.uri },
      range: publication.diagnostics[0]!.range,
      context: { diagnostics: publication.diagnostics },
    };
    await expect(connection.codeAction!(params, token)).resolves.toEqual([{
      title: "Apply all safe Mermaid fixes in this document",
      kind: "quickfix",
      diagnostics: publication.diagnostics,
      edit: {
        documentChanges: [{
          textDocument: { uri: document.uri, version: 3 },
          edits: [{ range: publication.diagnostics[0]!.range, newText: "" }],
        }],
      },
    }]);
    plan = { status: "unchanged", edits: [], originalResult: result };
    await expect(connection.codeAction!(params, token)).resolves.toEqual([]);
  });

  it("keeps the handler inert when the client lacks literal versioned edits", async () => {
    const connection = new FakeConnection();
    createLanguageServer(connection.asConnection(), new FakeDocuments().asDocuments());
    const initialized = connection.initialize!(initializeParams(false));
    expect(initialized.capabilities).not.toHaveProperty("codeActionProvider");
    await expect(connection.codeAction!({
      textDocument: { uri: "untitled:none" },
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      context: { diagnostics: [] },
    }, token)).resolves.toEqual([]);
  });

  it("returns no action when cancellation arrives and the planner ignores its signal", async () => {
    const connection = new FakeConnection();
    const documents = new FakeDocuments();
    const result: ValidationResult = {
      documentUri: "untitled:cancel",
      documentVersion: 1,
      diagramCount: 1,
      valid: true,
      findings: [{
        code: "example/fix",
        severity: "warning",
        message: "Fix me",
        source: "rule",
        locationPrecision: "exact",
        span: { startOffset: 0, endOffset: 1 },
        fixes: [{ span: { startOffset: 0, endOffset: 1 }, newText: "" }],
      }],
    };
    let resolvePlan!: (plan: DocumentFixPlan) => void;
    const pendingPlan = new Promise<DocumentFixPlan>((resolvePromise) => { resolvePlan = resolvePromise; });
    createLanguageServer(connection.asConnection(), documents.asDocuments(), {
      validate: vi.fn(async () => result),
      planFixes: vi.fn(async () => await pendingPlan),
    });
    connection.initialize!(initializeParams());
    const document = TextDocument.create("untitled:cancel", "mermaid", 1, "abc");
    documents.set(document);
    await waitForScheduler();
    const publication = connection.diagnostics[0] as { readonly diagnostics: CodeActionParams["context"]["diagnostics"] };
    const cancellation = cancellableToken();
    const action = connection.codeAction!({
      textDocument: { uri: document.uri },
      range: publication.diagnostics[0]!.range,
      context: { diagnostics: publication.diagnostics },
    }, cancellation.token);
    cancellation.cancel();
    resolvePlan({
      status: "changed",
      edits: [{ span: { startOffset: 0, endOffset: 1 }, newText: "" }],
      originalResult: result,
      output: "bc",
      proposedResult: { ...result, findings: [] },
    });
    await expect(action).resolves.toEqual([]);
    expect(connection.applyEdits).toEqual([]);
  });

  it.each<DocumentFixStatus>([
    "unchanged",
    "conflict",
    "invalid",
    "unsafe",
    "non-idempotent",
  ])("returns no action for planner status %s", async (status) => {
    let originalResult!: ValidationResult;
    const harness = await createFixHarness({
      planFixes: vi.fn(async () => ({ status, edits: [], originalResult })),
    });
    originalResult = harness.result;
    await expect(harness.connection.codeAction!(harness.params, token)).resolves.toEqual([]);
    expect(harness.connection.applyEdits).toEqual([]);
    expect(harness.stderr.write).not.toHaveBeenCalled();
  });

  it.each([
    ["AbortError", Object.assign(new Error("PRIVATE ABORT"), { name: "AbortError" }), false],
    ["unexpected error", new Error("PRIVATE PLANNER DETAIL"), true],
  ])("contains %s from the planner", async (_label, error, shouldLog) => {
    const harness = await createFixHarness({
      planFixes: vi.fn(async () => { throw error; }),
    });
    await expect(harness.connection.codeAction!(harness.params, token)).resolves.toEqual([]);
    expect(harness.connection.applyEdits).toEqual([]);
    if (shouldLog) {
      expect(harness.stderr.write).toHaveBeenCalledWith("Language server fix planning failed\n");
      expect(JSON.stringify(harness.stderr.write.mock.calls)).not.toContain("PRIVATE");
    } else {
      expect(harness.stderr.write).not.toHaveBeenCalled();
    }
  });

  it.each(["version change", "close"] as const)(
    "rejects a plan after document %s during planning",
    async (transition) => {
      const pending = deferred<DocumentFixPlan>();
      const harness = await createFixHarness({
        planFixes: vi.fn(async () => await pending.promise),
      });
      const action = harness.connection.codeAction!(harness.params, token);
      if (transition === "version change") {
        harness.documents.set(TextDocument.create(
          harness.document.uri,
          "mermaid",
          harness.document.version + 1,
          `${harness.document.getText()}x`,
        ));
      } else {
        harness.documents.closeDocument(harness.document.uri);
      }
      pending.resolve(changedPlan(harness.result));
      await expect(action).resolves.toEqual([]);
      expect(harness.connection.applyEdits).toEqual([]);
    },
  );

  it.each([
    ["zero-width", { span: { startOffset: 1, endOffset: 1 }, newText: "x" }],
    ["out-of-bounds", { span: { startOffset: 0, endOffset: 99 }, newText: "x" }],
  ])("rejects a changed plan containing a %s edit", async (_label, edit) => {
    let originalResult!: ValidationResult;
    const harness = await createFixHarness({
      planFixes: vi.fn(async () => changedPlan(originalResult, [edit])),
    });
    originalResult = harness.result;
    await expect(harness.connection.codeAction!(harness.params, token)).resolves.toEqual([]);
    expect(harness.connection.applyEdits).toEqual([]);
  });

  it("returns all planner edits and all current fixable diagnostics after one context match", async () => {
    let originalResult!: ValidationResult;
    const findings = [
      fixableFinding("example/first", 0, 1),
      fixableFinding("example/second", 2, 3),
    ];
    const harness = await createFixHarness({
      findings,
      planFixes: vi.fn(async () => changedPlan(originalResult, [
        { span: { startOffset: 0, endOffset: 1 }, newText: "A" },
        { span: { startOffset: 2, endOffset: 3 }, newText: "C" },
      ])),
    });
    originalResult = harness.result;
    const params = {
      ...harness.params,
      context: { diagnostics: [harness.params.context.diagnostics[0]!] },
    };
    const actions = await harness.connection.codeAction!(params, token);
    expect(actions).toHaveLength(1);
    expect(actions[0]).not.toHaveProperty("command");
    expect(actions[0]).not.toHaveProperty("isPreferred");
    expect(actions[0]?.diagnostics).toHaveLength(2);
    expect(actions[0]?.edit?.documentChanges?.[0]).toMatchObject({
      textDocument: { uri: harness.document.uri, version: harness.document.version },
      edits: [
        { newText: "A" },
        { newText: "C" },
      ],
    });
    expect(harness.connection.applyEdits).toEqual([]);
  });

  it("rejects forged or unknown request-context diagnostics", async () => {
    let originalResult!: ValidationResult;
    const harness = await createFixHarness({
      planFixes: vi.fn(async () => changedPlan(originalResult)),
    });
    originalResult = harness.result;
    const forged = {
      ...harness.params.context.diagnostics[0]!,
      message: "Forged message",
    };
    await expect(harness.connection.codeAction!({
      ...harness.params,
      context: { diagnostics: [forged] },
    }, token)).resolves.toEqual([]);
    expect(harness.connection.applyEdits).toEqual([]);
  });

  it("projects the real built-in document plan exactly and never applies it", async () => {
    const text = "flowchart LR\nA[\"`# Build`\"]";
    const snapshot = { uri: "untitled:real-plan", languageId: "mermaid" as const, text, version: 4 };
    const plan = await planDocumentFixes(snapshot);
    expect(plan.status).toBe("changed");
    const harness = await createFixHarness({
      uri: snapshot.uri,
      version: snapshot.version,
      text,
      findings: plan.originalResult.findings,
      planFixes: vi.fn(async () => plan),
    });
    const actions = await harness.connection.codeAction!(harness.params, token);
    expect(actions).toHaveLength(1);
    expect(applyActionEdits(text, actions[0]!)).toBe(plan.output);
    expect(harness.connection.applyEdits).toEqual([]);
  }, 15_000);
});
