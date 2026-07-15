export type TargetDiagramType =
  | "flowchart"
  | "sequence"
  | "pie"
  | "class"
  | "state";

export type EngineId =
  | "official-mermaid"
  | "mermaid-lint-official"
  | "mermaid-lint-aggregate"
  | "merman";

export type EngineVerdict =
  | "accepted"
  | "rejected"
  | "unsupported"
  | "engine-error";

export type ErrorFamily =
  | "parse-error"
  | "unsupported-type"
  | "initialization-error"
  | "engine-crash"
  | "unknown-engine-error";

export type LocationPrecision = "exact" | "approximate" | "document";

export interface EndpointPair {
  from: string;
  to: string;
}

export type SelectedFactSummary =
  | {
      type: "flowchart";
      nodeIds: string[];
      edges: EndpointPair[];
    }
  | {
      type: "sequence";
      participantIds: string[];
      messages: EndpointPair[];
    }
  | {
      type: "pie";
      sections: Array<{ label: string; value: number }>;
    }
  | {
      type: "class";
      classes: Array<{ id: string; memberCount: number }>;
      relations: EndpointPair[];
    }
  | {
      type: "state";
      stateIds: string[];
      transitions: EndpointPair[];
    };

export interface CompatibilityCase {
  id: string;
  path: string;
  diagramType: TargetDiagramType;
  expectedCanonicalVerdict: "accepted" | "rejected";
  tags: string[];
  expectedLocation?: "line" | "line-column";
  expectedOfficialDiagnostic?:
    | { precision: "approximate"; line: [number, number]; column?: [number, number] }
    | { precision: "document" };
  expectedFacts?: SelectedFactSummary;
}

export type LoadedCompatibilityCase = CompatibilityCase & { source: string };

export interface EngineObservation {
  fixtureId: string;
  engine: EngineId;
  engineVersion: string;
  verdict: EngineVerdict;
  errorFamily?: ErrorFamily;
  message?: string;
  rawDiagramType?: string;
  diagramType?: TargetDiagramType;
  location?: { line?: number; column?: number };
  locationPrecision: LocationPrecision;
  facts?: SelectedFactSummary;
  factCompleteness?: "complete-for-fixture" | "partial" | "unavailable";
}

export interface CompatibilityAdapter {
  readonly id: EngineId;
  readonly version: string;
  observe(fixture: LoadedCompatibilityCase): Promise<EngineObservation>;
}

export interface WorkerRequest {
  engine: EngineId;
  fixtures: LoadedCompatibilityCase[];
}
