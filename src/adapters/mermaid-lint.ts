import type { Block } from "@mermaid-lint/core";
import type { CompatibilityAdapter, EngineObservation, EngineId } from "../spike/contracts.js";
import { normalizeDiagramType, rejectedObservation } from "../spike/normalize.js";
import { ENGINE_VERSIONS } from "../spike/versions.js";

const VERSION = ENGINE_VERSIONS["mermaid-lint-official"];

function accepted(
  fixtureId: string,
  engine: EngineId,
  rawDiagramType: string,
): EngineObservation {
  const diagramType = normalizeDiagramType(rawDiagramType);
  return {
    fixtureId,
    engine,
    engineVersion: VERSION,
    verdict: "accepted",
    rawDiagramType,
    ...(diagramType === undefined ? {} : { diagramType }),
    locationPrecision: "document",
  };
}

export const mermaidLintOfficialAdapter: CompatibilityAdapter = {
  id: "mermaid-lint-official",
  version: VERSION,
  async observe(fixture): Promise<EngineObservation> {
    const { detectDiagramType, validateWithMermaidJS } = await import("@mermaid-lint/core");
    const rawDiagramType = detectDiagramType(fixture.source);
    const result = await validateWithMermaidJS(fixture.source);
    return result.ok
      ? accepted(fixture.id, this.id, rawDiagramType)
      : rejectedObservation(fixture, this.id, this.version, result.error, rawDiagramType);
  },
};

export const mermaidLintAggregateAdapter: CompatibilityAdapter = {
  id: "mermaid-lint-aggregate",
  version: VERSION,
  async observe(fixture): Promise<EngineObservation> {
    const { detectDiagramType, validateBlock } = await import("@mermaid-lint/core");
    const rawDiagramType = detectDiagramType(fixture.source);
    const block: Block = {
      path: fixture.path,
      line: 1,
      col: 1,
      body: fixture.source,
      type: rawDiagramType,
    };
    const result = await validateBlock(block);
    return result.ok
      ? accepted(fixture.id, this.id, rawDiagramType)
      : rejectedObservation(fixture, this.id, this.version, result.error, rawDiagramType);
  },
};
