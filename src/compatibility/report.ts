import type {
  CompatibilityCase,
  EngineId,
  EngineObservation,
} from "./contracts.js";

const NONCANONICAL_ENGINES: EngineId[] = [
  "mermaid-lint-official",
  "mermaid-lint-aggregate",
  "merman",
];

function matchesCanonicalExpectation(
  fixture: CompatibilityCase,
  observation: EngineObservation,
): boolean {
  return observation.verdict === fixture.expectedCanonicalVerdict;
}

function within(value: number | undefined, span: [number, number]): boolean {
  return value !== undefined && value >= span[0] && value <= span[1];
}

function matchesCoordinateExpectation(
  fixture: CompatibilityCase,
  observation: EngineObservation | undefined,
): boolean {
  const expected = fixture.expectedOfficialDiagnostic;
  if (!expected || !observation || observation.locationPrecision !== expected.precision) return false;
  if (expected.precision === "document") return observation.location === undefined;
  if (!within(observation.location?.line, expected.line)) return false;
  return expected.column === undefined || within(observation.location?.column, expected.column);
}

export function formatCompatibilitySummary(
  fixtures: CompatibilityCase[],
  observations: EngineObservation[],
): string {
  const mismatchParts = NONCANONICAL_ENGINES.flatMap((engine) => {
    const engineObservations = observations.filter((item) => item.engine === engine);
    if (engineObservations.length === 0) return [];
    const mismatches = engineObservations
      .filter((observation) => {
        const fixture = fixtures.find((item) => item.id === observation.fixtureId);
        return fixture !== undefined && !matchesCanonicalExpectation(fixture, observation);
      })
      .map((observation) => observation.fixtureId)
      .sort();
    return [`${engine} ${mismatches.length}${mismatches.length ? ` [${mismatches.join(", ")}]` : ""}`];
  });

  const invalidFixtures = fixtures.filter((fixture) => fixture.expectedCanonicalVerdict === "rejected");
  const officialInvalid = invalidFixtures.flatMap((fixture) => {
    const observation = observations.find(
      (item) => item.fixtureId === fixture.id && item.engine === "official-mermaid",
    );
    return observation ? [observation] : [];
  });
  const approximateLocations = officialInvalid.filter(
    (observation) => observation.locationPrecision === "approximate" && observation.location,
  ).length;
  const documentOnly = officialInvalid.filter(
    (observation) => observation.locationPrecision === "document",
  ).length;
  const coordinateFixtures = fixtures.filter((fixture) => fixture.expectedOfficialDiagnostic);
  const matchingCoordinates = coordinateFixtures.filter((fixture) =>
    matchesCoordinateExpectation(
      fixture,
      observations.find(
        (item) => item.fixtureId === fixture.id && item.engine === "official-mermaid",
      ),
    ),
  ).length;

  const factFixtures = fixtures.filter((fixture) => fixture.expectedFacts);
  const mermanFacts = factFixtures.map((fixture) =>
    observations.find((item) => item.fixtureId === fixture.id && item.engine === "merman"),
  );
  const completeFacts = mermanFacts.filter(
    (observation) => observation?.factCompleteness === "complete-for-fixture",
  ).length;
  const partialFacts = mermanFacts.filter(
    (observation) => observation?.factCompleteness === "partial",
  ).length;
  const unavailableFacts = factFixtures.length - completeFacts - partialFacts;

  return [
    `Compatibility summary: ${fixtures.length} fixtures, ${observations.length} observations`,
    `Verdict mismatches: ${mismatchParts.join("; ") || "none"}`,
    `Official diagnostics: approximate locations ${approximateLocations}/${invalidFixtures.length}; document-only ${documentOnly}/${invalidFixtures.length}; coordinate expectations ${matchingCoordinates}/${coordinateFixtures.length}`,
    `Merman facts: complete ${completeFacts}/${factFixtures.length}; partial ${partialFacts}; unavailable ${unavailableFacts}`,
  ].join("\n");
}
