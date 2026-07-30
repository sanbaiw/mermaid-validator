import {
  CodeActionKind,
  ErrorCodes,
  PositionEncodingKind,
  ResponseError,
  TextDocumentSyncKind,
  type CancellationToken,
  type CodeAction,
  type CodeActionParams,
  type Connection,
  type Diagnostic,
  type InitializeParams,
  type InitializeResult,
  type TextDocuments,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  planDocumentFixes,
  validateDocument,
  type DocumentSnapshot,
  type ResolvedRuleConfiguration,
} from "../validation/index.js";
import { resolveLspInitializationOptions } from "./contracts.js";
import { projectPlanEdits } from "./diagnostics.js";
import { createValidationScheduler, type ValidationScheduler } from "./validation-scheduler.js";

export const LANGUAGE_SERVER_NAME = "mermaid-diagram-validator";
export const LANGUAGE_SERVER_VERSION = "0.3.0";
const FIX_TITLE = "Apply all safe Mermaid fixes in this document";
const FIX_FAILURE_MESSAGE = "Language server fix planning failed\n";

export interface LanguageServerDependencies {
  readonly validate: typeof validateDocument;
  readonly planFixes: typeof planDocumentFixes;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

export interface LanguageServer {
  listen(): void;
  dispose(): void;
}

function supportsCodeActions(params: InitializeParams): boolean {
  return params.capabilities.textDocument?.codeAction?.codeActionLiteralSupport
    ?.codeActionKind.valueSet.includes(CodeActionKind.QuickFix) === true
    && params.capabilities.workspace?.workspaceEdit?.documentChanges === true;
}

function isSupported(
  document: TextDocument,
): document is TextDocument & { readonly languageId: "mermaid" | "markdown" } {
  return document.languageId === "mermaid" || document.languageId === "markdown";
}

function diagnosticEquals(left: Diagnostic, right: Diagnostic): boolean {
  return left.code === right.code
    && left.message === right.message
    && left.severity === right.severity
    && left.source === right.source
    && left.range.start.line === right.range.start.line
    && left.range.start.character === right.range.start.character
    && left.range.end.line === right.range.end.line
    && left.range.end.character === right.range.end.character;
}

function snapshotOf(document: TextDocument): DocumentSnapshot | undefined {
  if (!isSupported(document)) return undefined;
  return Object.freeze({
    uri: document.uri,
    languageId: document.languageId,
    text: document.getText(),
    version: document.version,
  });
}

function bridgeCancellation(token: CancellationToken, controller: AbortController): () => void {
  if (token.isCancellationRequested) controller.abort();
  const disposable = token.onCancellationRequested(() => controller.abort());
  return () => disposable.dispose();
}

export function createLanguageServer(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  providedDependencies: Partial<LanguageServerDependencies> = {},
): LanguageServer {
  const dependencies: LanguageServerDependencies = {
    validate: providedDependencies.validate ?? validateDocument,
    planFixes: providedDependencies.planFixes ?? planDocumentFixes,
    stderr: providedDependencies.stderr ?? process.stderr,
  };
  let scheduler: ValidationScheduler | undefined;
  let initializedRules: ResolvedRuleConfiguration | undefined;
  let codeActionsEnabled = false;
  let documentListener: { dispose(): void } | undefined;
  let listening = false;

  connection.onInitialize((params): InitializeResult => {
    const resolved = resolveLspInitializationOptions(params.initializationOptions);
    if (!resolved.ok) throw new ResponseError(ErrorCodes.InvalidParams, resolved.message);
    scheduler?.dispose();
    scheduler = createValidationScheduler(resolved.value.debounceMs, {
      validate: dependencies.validate,
      publishDiagnostics: async (publication) => {
        await connection.sendDiagnostics({
          uri: publication.uri,
          ...(publication.version === undefined ? {} : { version: publication.version }),
          diagnostics: [...publication.diagnostics],
        });
      },
      logger: (message) => { dependencies.stderr.write(message); },
    });
    initializedRules = resolved.value.rules;
    codeActionsEnabled = supportsCodeActions(params);
    return {
      capabilities: {
        positionEncoding: PositionEncodingKind.UTF16,
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
        },
        ...(codeActionsEnabled
          ? { codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] } }
          : {}),
      },
      serverInfo: { name: LANGUAGE_SERVER_NAME, version: LANGUAGE_SERVER_VERSION },
    };
  });

  documents.onDidChangeContent(({ document }) => {
    if (!scheduler || !initializedRules) return;
    if (isSupported(document)) {
      scheduler.schedule(document, initializedRules);
    } else {
      scheduler.close(document.uri, document.version);
    }
  });

  documents.onDidClose(({ document }) => {
    scheduler?.close(document.uri, document.version);
  });

  connection.onCodeAction(async (
    params: CodeActionParams,
    token: CancellationToken,
  ): Promise<CodeAction[]> => {
    if (!codeActionsEnabled || !scheduler) return [];
    const document = documents.get(params.textDocument.uri);
    const accepted = scheduler.current(params.textDocument.uri);
    if (!document || !accepted || document.version !== accepted.snapshot.version) return [];
    const fixable = accepted.projected.filter(({ finding }) => (finding.fixes?.length ?? 0) > 0);
    if (!params.context.diagnostics.some((requested) =>
      fixable.some(({ diagnostic }) => diagnosticEquals(requested, diagnostic)))) return [];

    const snapshot = snapshotOf(document);
    if (!snapshot) return [];
    const controller = new AbortController();
    const disposeCancellation = bridgeCancellation(token, controller);
    try {
      const plan = await dependencies.planFixes(snapshot, {
        rules: accepted.rules,
        signal: controller.signal,
      });
      const currentDocument = documents.get(snapshot.uri);
      const currentAccepted = scheduler.current(snapshot.uri);
      if (controller.signal.aborted
        || plan.status !== "changed"
        || plan.edits.length === 0
        || !currentDocument
        || currentDocument.version !== snapshot.version
        || currentAccepted !== accepted) return [];
      const projectionDocument = TextDocument.create(
        snapshot.uri,
        snapshot.languageId,
        snapshot.version ?? 0,
        snapshot.text,
      );
      const edits = projectPlanEdits(projectionDocument, plan.edits);
      if (!edits || edits.length === 0) return [];
      return [{
        title: FIX_TITLE,
        kind: CodeActionKind.QuickFix,
        diagnostics: fixable.map(({ diagnostic }) => diagnostic),
        edit: {
          documentChanges: [{
            textDocument: { uri: snapshot.uri, version: snapshot.version ?? null },
            edits: [...edits],
          }],
        },
      }];
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        dependencies.stderr.write(FIX_FAILURE_MESSAGE);
      }
      return [];
    } finally {
      disposeCancellation();
    }
  });

  connection.onShutdown(() => {
    scheduler?.dispose();
  });

  return {
    listen(): void {
      if (listening) return;
      listening = true;
      documentListener = documents.listen(connection);
      connection.listen();
    },
    dispose(): void {
      scheduler?.dispose();
      documentListener?.dispose();
    },
  };
}
