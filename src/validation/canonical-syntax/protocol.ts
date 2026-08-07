export type TargetDiagramType = "flowchart" | "sequence" | "pie" | "class" | "state";

export type TimeoutPhase = "startup" | "request";
export type EngineFailure =
  | "initialization"
  | "timeout"
  | "runtime"
  | "crash"
  | "protocol"
  | "restart-suppressed";
export type StartupFailure = "initialization" | "timeout" | "crash" | "protocol";
export type RestartSuppressionCause =
  | { readonly kind: "startup-failure"; readonly failure: StartupFailure }
  | { readonly kind: "consecutive-request-timeouts" };

type AcceptedOutcome = { kind: "accepted"; diagramType: TargetDiagramType; engineVersion: string };
type SyntaxErrorOutcome = {
  kind: "syntax-error";
  message: string;
  diagramType?: string;
  location?: { line?: number; column?: number };
  locationPrecision: "approximate" | "document";
  engineVersion: string;
};
type UnsupportedTypeOutcome = {
  kind: "unsupported-type";
  diagramType: string;
  message: string;
  engineVersion: string;
};

export type WorkerSyntaxOutcome =
  | AcceptedOutcome
  | SyntaxErrorOutcome
  | UnsupportedTypeOutcome
  | {
      kind: "engine-failure";
      failure: Exclude<EngineFailure, "timeout" | "restart-suppressed">;
      message: string;
    };

export type HostEngineFailureOutcome = {
  kind: "engine-failure";
  failure: Exclude<EngineFailure, "timeout" | "restart-suppressed">;
  message: string;
  debugDetail?: string;
};
export type TimeoutOutcome = {
  kind: "engine-failure";
  failure: "timeout";
  phase: TimeoutPhase;
  message: string;
  debugDetail?: string;
};
export type RestartSuppressedOutcome = {
  kind: "engine-failure";
  failure: "restart-suppressed";
  cause: RestartSuppressionCause;
  message: string;
};

export type SyntaxOutcome =
  | AcceptedOutcome
  | SyntaxErrorOutcome
  | UnsupportedTypeOutcome
  | HostEngineFailureOutcome
  | TimeoutOutcome
  | RestartSuppressedOutcome;

export interface ValidateRequest {
  readonly type: "validate";
  readonly requestId: number;
  readonly source: string;
}

export type WorkerMessage =
  | { readonly type: "ready" }
  | { readonly type: "initialization-failed"; readonly message: string }
  | { readonly type: "response"; readonly requestId: number; readonly outcome: WorkerSyntaxOutcome };
