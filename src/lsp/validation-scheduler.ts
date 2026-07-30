import { TextDocument } from "vscode-languageserver-textdocument";
import {
  validateDocument,
  type DocumentSnapshot,
  type ResolvedRuleConfiguration,
  type ValidationResult,
} from "../validation/index.js";
import { projectValidationResult, type ProjectedFinding } from "./diagnostics.js";

const UNEXPECTED_VALIDATION_MESSAGE = "Language server validation failed\n";

export interface AcceptedDocumentState {
  readonly snapshot: DocumentSnapshot;
  readonly result: ValidationResult;
  readonly projected: readonly ProjectedFinding[];
  readonly rules: ResolvedRuleConfiguration;
  readonly generation: number;
}

export interface ValidationScheduler {
  schedule(document: TextDocument, rules: ResolvedRuleConfiguration): void;
  close(uri: string, version?: number): void;
  current(uri: string): AcceptedDocumentState | undefined;
  dispose(): void;
}

export interface PublishedDiagnostics {
  readonly uri: string;
  readonly version?: number;
  readonly diagnostics: readonly ProjectedFinding["diagnostic"][];
}

export interface ValidationSchedulerDependencies {
  readonly validate: typeof validateDocument;
  readonly publishDiagnostics: (publication: PublishedDiagnostics) => Promise<void>;
  readonly logger: (message: string) => void;
  readonly setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
}

interface ScheduledDocumentState {
  readonly generation: number;
  readonly version: number;
  timer: ReturnType<typeof setTimeout> | undefined;
  controller: AbortController | undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function immutableSnapshot(document: TextDocument): DocumentSnapshot {
  const languageId = document.languageId;
  if (languageId !== "mermaid" && languageId !== "markdown") {
    throw new Error("Unsupported document language");
  }
  return Object.freeze({
    uri: document.uri,
    languageId,
    text: document.getText(),
    version: document.version,
  });
}

export function createValidationScheduler(
  debounceMs: number,
  dependencies: Partial<ValidationSchedulerDependencies> & Pick<ValidationSchedulerDependencies, "publishDiagnostics">,
): ValidationScheduler {
  const validate = dependencies.validate ?? validateDocument;
  const publishDiagnostics = dependencies.publishDiagnostics;
  const logger = dependencies.logger ?? ((message: string) => process.stderr.write(message));
  const setTimer = dependencies.setTimer ?? setTimeout;
  const clearTimer = dependencies.clearTimer ?? clearTimeout;
  const scheduled = new Map<string, ScheduledDocumentState>();
  const accepted = new Map<string, AcceptedDocumentState>();
  let disposed = false;

  const isCurrent = (snapshot: DocumentSnapshot, generation: number): boolean => {
    const state = scheduled.get(snapshot.uri);
    return state !== undefined
      && state.generation === generation
      && state.version === snapshot.version;
  };

  const start = async (
    snapshot: DocumentSnapshot,
    rules: ResolvedRuleConfiguration,
    generation: number,
  ): Promise<void> => {
    const state = scheduled.get(snapshot.uri);
    if (!state || state.generation !== generation) return;
    state.timer = undefined;
    const controller = new AbortController();
    state.controller = controller;
    try {
      const result = await validate(snapshot, { rules, signal: controller.signal });
      if (!isCurrent(snapshot, generation)) return;
      const snapshotDocument = TextDocument.create(
        snapshot.uri,
        snapshot.languageId,
        snapshot.version ?? 0,
        snapshot.text,
      );
      const projected = projectValidationResult(snapshotDocument, result);
      await publishDiagnostics({
        uri: snapshot.uri,
        ...(snapshot.version === undefined ? {} : { version: snapshot.version }),
        diagnostics: projected.map(({ diagnostic }) => diagnostic),
      });
      if (!isCurrent(snapshot, generation)) return;
      accepted.set(snapshot.uri, Object.freeze({ snapshot, result, projected, rules, generation }));
    } catch (error) {
      if (isAbortError(error) || !isCurrent(snapshot, generation)) return;
      logger(UNEXPECTED_VALIDATION_MESSAGE);
      try {
        await publishDiagnostics({
          uri: snapshot.uri,
          ...(snapshot.version === undefined ? {} : { version: snapshot.version }),
          diagnostics: [],
        });
      } catch {
        // A failed transport cannot be cleared, but must not escape the detached scheduler task.
      }
      if (isCurrent(snapshot, generation)) accepted.delete(snapshot.uri);
    } finally {
      const current = scheduled.get(snapshot.uri);
      if (current?.generation === generation && current.controller === controller) {
        current.controller = undefined;
      }
    }
  };

  return {
    schedule(document, rules): void {
      if (disposed) return;
      const snapshot = immutableSnapshot(document);
      const previous = scheduled.get(snapshot.uri);
      if (previous?.timer) clearTimer(previous.timer);
      previous?.controller?.abort();
      accepted.delete(snapshot.uri);
      const generation = (previous?.generation ?? 0) + 1;
      const next: ScheduledDocumentState = {
        generation,
        version: snapshot.version ?? 0,
        timer: undefined,
        controller: undefined,
      };
      scheduled.set(snapshot.uri, next);
      next.timer = setTimer(() => { void start(snapshot, rules, generation); }, debounceMs);
    },

    close(uri, version): void {
      const state = scheduled.get(uri);
      if (state?.timer) clearTimer(state.timer);
      state?.controller?.abort();
      scheduled.delete(uri);
      accepted.delete(uri);
      if (!disposed) {
        void publishDiagnostics({
          uri,
          ...(version === undefined ? {} : { version }),
          diagnostics: [],
        }).catch(() => { logger(UNEXPECTED_VALIDATION_MESSAGE); });
      }
    },

    current(uri): AcceptedDocumentState | undefined {
      const value = accepted.get(uri);
      return value && isCurrent(value.snapshot, value.generation) ? value : undefined;
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      for (const state of scheduled.values()) {
        if (state.timer) clearTimer(state.timer);
        state.controller?.abort();
      }
      scheduled.clear();
      accepted.clear();
    },
  };
}
