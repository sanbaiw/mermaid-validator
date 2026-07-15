import { beforeAll, describe, expect, it } from "vitest";
import {
  compatibilityManifest,
  countByTypeAndVerdict,
  loadCompatibilityCorpus,
} from "../../fixtures/compatibility/manifest.js";
import type {
  EngineId,
  EngineObservation,
  LoadedCompatibilityCase,
} from "../../src/compatibility/contracts.js";
import { formatCompatibilitySummary } from "../../src/compatibility/report.js";
import { runEngineIsolated } from "../../src/compatibility/run-isolated.js";

const engines: EngineId[] = [
  "official-mermaid",
  "mermaid-lint-official",
  "mermaid-lint-aggregate",
  "merman",
];

let corpus: LoadedCompatibilityCase[] = [];
let matrix: EngineObservation[] = [];

beforeAll(async () => {
  corpus = await loadCompatibilityCorpus();
  const results = await Promise.all(engines.map((engine) => runEngineIsolated(engine, corpus)));
  matrix = results.flat().sort((a, b) =>
    `${a.fixtureId}\u0000${a.engine}`.localeCompare(`${b.fixtureId}\u0000${b.engine}`),
  );
}, 120_000);

function classifications(
  fixture: LoadedCompatibilityCase,
  observation: EngineObservation,
): string[] {
  const result: string[] = [];
  if (observation.verdict === "engine-error") result.push("engine-failure");
  if (fixture.expectedCanonicalVerdict === "accepted") {
    if (observation.verdict === "rejected") result.push("false-rejection");
    if (observation.verdict === "unsupported") result.push("unsupported-feature");
  } else if (observation.verdict === "accepted") {
    result.push("false-acceptance");
  }
  if (
    fixture.expectedLocation &&
    (observation.verdict === "rejected" || observation.verdict === "unsupported") &&
    observation.location === undefined
  ) {
    result.push("missing-location");
  }
  if (
    observation.engine === "merman" &&
    fixture.expectedFacts &&
    observation.verdict === "accepted" &&
    observation.factCompleteness !== "complete-for-fixture"
  ) {
    result.push("missing-fact");
  }
  return result;
}

describe("compatibility fixture manifest", () => {
  it("contains the required self-contained five-family corpus", () => {
    expect(compatibilityManifest).toHaveLength(27);
    expect(corpus).toHaveLength(27);
    for (const counts of Object.values(countByTypeAndVerdict())) {
      expect(counts.accepted).toBeGreaterThanOrEqual(2);
      expect(counts.rejected).toBeGreaterThanOrEqual(3);
    }
    expect(corpus.every((fixture) => fixture.source.trim().length > 0)).toBe(true);
    expect(corpus.every((fixture) => !fixture.path.includes("modern-agent"))).toBe(true);
  });
});

describe("four-engine compatibility matrix", () => {
  it("returns one normalized observation per engine and fixture", () => {
    expect(matrix).toHaveLength(corpus.length * engines.length);
    for (const fixture of corpus) {
      expect(matrix.filter((item) => item.fixtureId === fixture.id)).toHaveLength(engines.length);
    }
  });

  it("uses official Mermaid as the canonical verdict without engine failures", () => {
    for (const fixture of corpus) {
      const observation = matrix.find(
        (item) => item.fixtureId === fixture.id && item.engine === "official-mermaid",
      );
      expect(observation, fixture.id).toBeDefined();
      expect(observation?.verdict, fixture.id).toBe(fixture.expectedCanonicalVerdict);
      if (fixture.expectedCanonicalVerdict === "rejected") {
        expect(observation?.message, fixture.id).toBeTruthy();
        expect(observation?.errorFamily, fixture.id).toBe("parse-error");
      }
    }
  });

  it("keeps representative official coordinates within fixture-level acceptable spans", () => {
    const representativeFixtures = corpus.filter((fixture) => fixture.expectedOfficialDiagnostic);
    expect(representativeFixtures).toHaveLength(5);
    for (const fixture of representativeFixtures) {
      const observation = matrix.find(
        (item) => item.fixtureId === fixture.id && item.engine === "official-mermaid",
      );
      const expected = fixture.expectedOfficialDiagnostic;
      if (!expected) throw new Error(`Missing official diagnostic expectation for ${fixture.id}`);
      expect(observation, fixture.id).toBeDefined();
      expect(observation?.locationPrecision, fixture.id).toBe(expected.precision);
      if (expected.precision === "document") {
        expect(observation?.location, fixture.id).toBeUndefined();
        continue;
      }
      expect(observation?.location?.line, fixture.id).toBeGreaterThanOrEqual(expected.line[0]);
      expect(observation?.location?.line, fixture.id).toBeLessThanOrEqual(expected.line[1]);
      if (expected.column) {
        expect(observation?.location?.column, fixture.id).toBeGreaterThanOrEqual(expected.column[0]);
        expect(observation?.location?.column, fixture.id).toBeLessThanOrEqual(expected.column[1]);
      }
    }
  });

  it("returns complete selected Merman facts for every valid corpus fixture", () => {
    for (const fixture of corpus.filter((item) => item.expectedFacts)) {
      const observation = matrix.find(
        (item) => item.fixtureId === fixture.id && item.engine === "merman",
      );
      expect(observation, fixture.id).toBeDefined();
      expect(observation?.factCompleteness, fixture.id).toBe("complete-for-fixture");
      expect(observation?.facts, fixture.id).toEqual(fixture.expectedFacts);
    }
  });

  it("prints a compact human-readable compatibility summary", () => {
    const summary = formatCompatibilitySummary(corpus, matrix);
    process.stdout.write(`\n${summary}\n`);
    expect(summary).toContain("Compatibility summary: 27 fixtures, 108 observations");
    expect(summary).toContain("Official diagnostics: approximate locations 9/15; document-only 6/15; coordinate expectations 5/5");
    expect(summary).toContain("Merman facts: complete 12/12; partial 0; unavailable 0");
  });

  it("snapshots the normalized observation matrix", () => {
    expect(matrix).toMatchSnapshot();
  });

  it("classifies every visible noncanonical discrepancy", () => {
    const discrepancies = matrix.flatMap((observation) => {
      if (observation.engine === "official-mermaid") return [];
      const fixture = corpus.find((item) => item.id === observation.fixtureId);
      if (!fixture) throw new Error(`Missing fixture for ${observation.fixtureId}`);
      const kinds = classifications(fixture, observation);
      return kinds.length === 0
        ? []
        : [{ fixtureId: fixture.id, engine: observation.engine, classifications: kinds }];
    });
    expect(discrepancies).toMatchSnapshot();
  });

  it("does not leak unstable raw engine payloads into evidence", () => {
    const serialized = JSON.stringify(matrix);
    expect(serialized).not.toContain('"stack"');
    expect(serialized).not.toContain("merman_wasm_bg");
    expect(serialized).not.toContain(process.cwd());
  });
});
