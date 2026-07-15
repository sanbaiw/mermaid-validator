import { describe, expect, it } from "vitest";
import type { EngineObservation, LoadedCompatibilityCase } from "../../src/compatibility/contracts.js";
import { formatCompatibilitySummary } from "../../src/compatibility/report.js";

const fixtures: LoadedCompatibilityCase[] = [
  {
    id: "valid",
    path: "valid.mmd",
    diagramType: "flowchart",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid"],
    source: "flowchart LR\nA --> B\n",
    expectedFacts: { type: "flowchart", nodeIds: ["A", "B"], edges: [{ from: "A", to: "B" }] },
  },
  {
    id: "invalid",
    path: "invalid.mmd",
    diagramType: "flowchart",
    expectedCanonicalVerdict: "rejected",
    tags: ["invalid"],
    source: "flowchart LR\nA -x-> B\n",
    expectedOfficialDiagnostic: { precision: "approximate", line: [2, 2], column: [4, 4] },
  },
];

const observations: EngineObservation[] = [
  { fixtureId: "valid", engine: "official-mermaid", engineVersion: "11.16.0", verdict: "accepted", locationPrecision: "document" },
  { fixtureId: "invalid", engine: "official-mermaid", engineVersion: "11.16.0", verdict: "rejected", location: { line: 2, column: 4 }, locationPrecision: "approximate" },
  { fixtureId: "valid", engine: "merman", engineVersion: "0.7.0", verdict: "accepted", locationPrecision: "document", factCompleteness: "complete-for-fixture", facts: fixtures[0]!.expectedFacts! },
  { fixtureId: "invalid", engine: "merman", engineVersion: "0.7.0", verdict: "accepted", locationPrecision: "document" },
];

describe("compatibility summary", () => {
  it("reports verdict mismatches, location evidence, and fact completeness", () => {
    expect(formatCompatibilitySummary(fixtures, observations)).toBe([
      "Compatibility summary: 2 fixtures, 4 observations",
      "Verdict mismatches: merman 1 [invalid]",
      "Official diagnostics: approximate locations 1/1; document-only 0/1; coordinate expectations 1/1",
      "Merman facts: complete 1/1; partial 0; unavailable 0",
    ].join("\n"));
  });
});
