import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type {
  CompatibilityAdapter,
  EndpointPair,
  EngineObservation,
  LoadedCompatibilityCase,
  SelectedFactSummary,
} from "../spike/contracts.js";
import { conciseMessage, normalizeDiagramType, rejectedObservation } from "../spike/normalize.js";
import { ENGINE_VERSIONS } from "../spike/versions.js";

const VERSION = ENGINE_VERSIONS.merman;
const require = createRequire(import.meta.url);
let initialization: Promise<typeof import("@mermanjs/web")> | undefined;

async function initialize(): Promise<typeof import("@mermanjs/web")> {
  initialization ??= (async () => {
    const api = await import("@mermanjs/web");
    const wasmPath = require.resolve("@mermanjs/web/pkg/merman_wasm_bg.wasm");
    const wasmBytes = await readFile(wasmPath);
    await api.initMerman({ wasm: { module_or_path: wasmBytes } });
    return api;
  })();
  return initialization;
}

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    : [];
}

function objectRecord(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, Record<string, unknown>] =>
      !!entry[1] && typeof entry[1] === "object" && !Array.isArray(entry[1]),
    ),
  );
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const pairSort = (a: { from: string; to: string }, b: { from: string; to: string }): number =>
  `${a.from}\u0000${a.to}`.localeCompare(`${b.from}\u0000${b.to}`);

function selectedStateFacts(parsed: Record<string, unknown>): SelectedFactSummary {
  const stateIds = new Set<string>();
  const transitions = new Map<string, EndpointPair>();
  const isCompositeBoundary = (id: string): boolean =>
    id !== "root_start" && id !== "root_end" && /_(?:start|end)$/.test(id);
  const addState = (id: string): void => {
    if (id && !isCompositeBoundary(id)) stateIds.add(id);
  };
  const addTransition = (from: string, to: string): void => {
    if (!from || !to || isCompositeBoundary(from) || isCompositeBoundary(to)) return;
    addState(from);
    addState(to);
    transitions.set(`${from}\u0000${to}`, { from, to });
  };
  const visitDocument = (value: unknown): void => {
    for (const statement of records(value)) {
      if (statement.stmt === "relation") {
        const state1 = statement.state1 as Record<string, unknown> | undefined;
        const state2 = statement.state2 as Record<string, unknown> | undefined;
        addTransition(text(state1?.id), text(state2?.id));
      }
      visitDocument(statement.doc);
    }
  };

  for (const [key, state] of Object.entries(objectRecord(parsed.states))) {
    addState(text(state.id) || key);
    visitDocument(state.doc);
  }
  for (const relation of records(parsed.relations)) {
    addTransition(text(relation.id1), text(relation.id2));
  }

  return {
    type: "state",
    stateIds: [...stateIds].sort(),
    transitions: [...transitions.values()].sort(pairSort),
  };
}

function selectedFacts(
  fixture: LoadedCompatibilityCase,
  parsed: Record<string, unknown>,
): SelectedFactSummary | undefined {
  switch (fixture.diagramType) {
    case "flowchart":
      return {
        type: "flowchart",
        nodeIds: records(parsed.nodes).map((node) => text(node.id)).filter(Boolean).sort(),
        edges: records(parsed.edges)
          .map((edge) => ({ from: text(edge.from), to: text(edge.to) }))
          .filter((edge) => edge.from && edge.to)
          .sort(pairSort),
      };
    case "sequence":
      return {
        type: "sequence",
        participantIds: Object.keys(objectRecord(parsed.actors)).sort(),
        messages: records(parsed.messages)
          .map((message) => ({ from: text(message.from), to: text(message.to) }))
          .filter((message) => message.from && message.to)
          .sort(pairSort),
      };
    case "pie":
      return {
        type: "pie",
        sections: records(parsed.sections)
          .map((section) => ({ label: text(section.label), value: Number(section.value) }))
          .filter((section) => section.label && Number.isFinite(section.value))
          .sort((a, b) => a.label.localeCompare(b.label)),
      };
    case "class":
      return {
        type: "class",
        classes: Object.values(objectRecord(parsed.classes))
          .map((item) => ({
            id: text(item.id),
            memberCount: records(item.members).length + records(item.methods).length,
          }))
          .filter((item) => item.id)
          .sort((a, b) => a.id.localeCompare(b.id)),
        relations: records(parsed.relations)
          .map((relation) => ({ from: text(relation.id1), to: text(relation.id2) }))
          .filter((relation) => relation.from && relation.to)
          .sort(pairSort),
      };
    case "state":
      return selectedStateFacts(parsed);
  }
}

function sameFacts(actual: SelectedFactSummary | undefined, expected: SelectedFactSummary | undefined): boolean {
  return actual !== undefined && expected !== undefined && JSON.stringify(actual) === JSON.stringify(expected);
}

export const mermanAdapter: CompatibilityAdapter = {
  id: "merman",
  version: VERSION,
  async observe(fixture): Promise<EngineObservation> {
    const api = await initialize();
    const result = api.validate(fixture.source);
    if (!result.valid) {
      if (result.code_name === "MERMAN_NO_DIAGRAM" || result.code_name === "MERMAN_UNSUPPORTED_FORMAT") {
        return rejectedObservation(
          fixture,
          this.id,
          this.version,
          result.error || result.code_name,
          undefined,
          "unsupported-type",
        );
      }
      if (result.code_name === "MERMAN_PARSE_ERROR") {
        return rejectedObservation(fixture, this.id, this.version, result.error || result.code_name);
      }
      return {
        fixtureId: fixture.id,
        engine: this.id,
        engineVersion: this.version,
        verdict: "engine-error",
        errorFamily: "initialization-error",
        message: conciseMessage(result.error || result.code_name),
        diagramType: fixture.diagramType,
        locationPrecision: "document",
      };
    }

    const parsed = api.parseObject<Record<string, unknown>>(fixture.source);
    const rawDiagramType = text(parsed.type);
    const diagramType = normalizeDiagramType(rawDiagramType);
    const facts = selectedFacts(fixture, parsed);
    return {
      fixtureId: fixture.id,
      engine: this.id,
      engineVersion: this.version,
      verdict: "accepted",
      ...(rawDiagramType ? { rawDiagramType } : {}),
      diagramType: diagramType ?? fixture.diagramType,
      locationPrecision: "document",
      ...(facts === undefined ? {} : { facts }),
      factCompleteness:
        fixture.expectedFacts === undefined
          ? "unavailable"
          : sameFacts(facts, fixture.expectedFacts)
            ? "complete-for-fixture"
            : "partial",
    };
  },
};
