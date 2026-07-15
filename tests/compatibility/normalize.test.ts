import { describe, expect, it } from "vitest";
import type { LoadedCompatibilityCase } from "../../src/compatibility/contracts.js";
import { rejectedObservation } from "../../src/compatibility/normalize.js";

const fixture: LoadedCompatibilityCase = {
  id: "structured-error",
  path: "fixtures/compatibility/flowchart/invalid-edge.mmd",
  diagramType: "flowchart",
  expectedCanonicalVerdict: "rejected",
  tags: ["invalid"],
  source: "flowchart LR\nA -x-> B\n",
};

describe("compatibility diagnostic normalization", () => {
  it("retains the message from a structured upstream diagnostic", () => {
    const observation = rejectedObservation(
      fixture,
      "mermaid-lint-official",
      "0.35.0",
      { message: "Unexpected relationship token", line: 2, col: 4 },
    );

    expect(observation).toMatchObject({
      message: "Unexpected relationship token",
      location: { line: 2, column: 4 },
      locationPrecision: "approximate",
    });
  });
});
