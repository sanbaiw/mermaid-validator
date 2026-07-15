import type {
  EngineId,
  EngineObservation,
  ErrorFamily,
  LoadedCompatibilityCase,
  TargetDiagramType,
} from "./contracts.js";

const TYPE_ALIASES: Readonly<Record<string, TargetDiagramType>> = {
  graph: "flowchart",
  flowchart: "flowchart",
  "flowchart-v2": "flowchart",
  sequence: "sequence",
  sequenceDiagram: "sequence",
  pie: "pie",
  class: "class",
  classDiagram: "class",
  state: "state",
  stateDiagram: "state",
  "stateDiagram-v2": "state",
};

export function normalizeDiagramType(raw: unknown): TargetDiagramType | undefined {
  return typeof raw === "string" ? TYPE_ALIASES[raw] : undefined;
}

export function conciseMessage(error: unknown): string {
  const structuredMessage =
    error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string"
      ? (error as { message: string }).message
      : undefined;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : structuredMessage !== undefined
          ? structuredMessage
          : String(error);
  const firstLine = raw.split(/\r?\n/, 1)[0]?.trim();
  return firstLine || "Unknown engine error";
}

export function normalizeLocation(error: unknown):
  | { location: { line?: number; column?: number }; precision: "approximate" }
  | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as Record<string, unknown>;
  const hash =
    record.hash && typeof record.hash === "object"
      ? (record.hash as Record<string, unknown>)
      : undefined;
  const loc =
    hash?.loc && typeof hash.loc === "object"
      ? (hash.loc as Record<string, unknown>)
      : undefined;
  const line =
    typeof loc?.first_line === "number"
      ? loc.first_line
      : typeof hash?.line === "number"
        ? hash.line
      : typeof record.line === "number"
        ? record.line
        : undefined;
  const column =
    typeof loc?.first_column === "number"
      ? loc.first_column + 1
      : typeof record.col === "number"
        ? record.col
        : typeof record.column === "number"
          ? record.column
          : undefined;
  if (line === undefined && column === undefined) return undefined;
  return { location: { ...(line === undefined ? {} : { line }), ...(column === undefined ? {} : { column }) }, precision: "approximate" };
}

export function rejectedObservation(
  fixture: LoadedCompatibilityCase,
  engine: EngineId,
  version: string,
  error: unknown,
  rawDiagramType?: string,
  family: ErrorFamily = "parse-error",
): EngineObservation {
  const normalizedLocation = normalizeLocation(error);
  const diagramType = normalizeDiagramType(rawDiagramType);
  return {
    fixtureId: fixture.id,
    engine,
    engineVersion: version,
    verdict: family === "unsupported-type" ? "unsupported" : "rejected",
    errorFamily: family,
    message: conciseMessage(error),
    ...(rawDiagramType === undefined ? {} : { rawDiagramType }),
    ...(diagramType === undefined ? {} : { diagramType }),
    ...(normalizedLocation === undefined ? {} : { location: normalizedLocation.location }),
    locationPrecision: normalizedLocation?.precision ?? "document",
  };
}

export function engineFailureObservations(
  engine: EngineId,
  version: string,
  fixtures: LoadedCompatibilityCase[],
  message: string,
  family: ErrorFamily = "engine-crash",
): EngineObservation[] {
  return fixtures.map((fixture) => ({
    fixtureId: fixture.id,
    engine,
    engineVersion: version,
    verdict: "engine-error",
    errorFamily: family,
    message: conciseMessage(message),
    diagramType: fixture.diagramType,
    locationPrecision: "document",
  }));
}
