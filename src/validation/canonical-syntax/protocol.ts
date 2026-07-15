export type TargetDiagramType = "flowchart" | "sequence" | "pie" | "class" | "state";

export type EngineFailure = "initialization" | "timeout" | "runtime" | "crash" | "protocol";

export type SyntaxOutcome =
  | { kind: "accepted"; diagramType: TargetDiagramType; engineVersion: string }
  | {
      kind: "syntax-error";
      message: string;
      diagramType?: string;
      location?: { line?: number; column?: number };
      locationPrecision: "approximate" | "document";
      engineVersion: string;
    }
  | { kind: "unsupported-type"; diagramType: string; message: string; engineVersion: string }
  | { kind: "engine-failure"; failure: EngineFailure; message: string; debugDetail?: string };

export interface ValidateRequest {
  readonly type: "validate";
  readonly requestId: number;
  readonly source: string;
}

export type WorkerMessage =
  | { readonly type: "ready" }
  | { readonly type: "initialization-failed"; readonly message: string }
  | { readonly type: "response"; readonly requestId: number; readonly outcome: SyntaxOutcome };
