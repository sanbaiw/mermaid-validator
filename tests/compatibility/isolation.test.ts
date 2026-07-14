import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { LoadedCompatibilityCase } from "../../src/spike/contracts.js";
import { runEngineIsolated } from "../../src/spike/run-isolated.js";

const smokeFixture: LoadedCompatibilityCase = {
  id: "worker-smoke",
  path: "fixtures/compatibility/flowchart/valid-minimal.mmd",
  diagramType: "flowchart",
  expectedCanonicalVerdict: "accepted",
  tags: ["smoke"],
  source: "flowchart LR\nA --> B\n",
};

describe("isolated engine process wrapper", () => {
  it.each([
    ["nonzero exit", "tests/fixtures/workers/exit-nonzero.mjs", "Worker exited with code 7"],
    ["malformed output", "tests/fixtures/workers/malformed-output.mjs", "Worker returned malformed JSON"],
    ["malformed observation", "tests/fixtures/workers/malformed-observation.mjs", "Worker returned malformed observation at index 0"],
  ])("turns %s into a structured engine failure", async (_label, workerPath, message) => {
    const promise = runEngineIsolated("official-mermaid", [smokeFixture], {
      workerPath: resolve(process.cwd(), workerPath),
      timeoutMs: 5_000,
    });
    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        fixtureId: smokeFixture.id,
        engine: "official-mermaid",
        verdict: "engine-error",
        errorFamily: "engine-crash",
        message: expect.stringContaining(message),
      }),
    ]);
  });

  it("terminates a timed-out worker and returns a structured engine failure", async () => {
    const promise = runEngineIsolated("official-mermaid", [smokeFixture], {
      workerPath: resolve(process.cwd(), "tests/fixtures/workers/hang.mjs"),
      timeoutMs: 100,
    });

    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        fixtureId: smokeFixture.id,
        engine: "official-mermaid",
        verdict: "engine-error",
        errorFamily: "engine-crash",
        message: "Worker timed out after 100ms",
      }),
    ]);
  });

  it("preserves a well-formed initialization error observation", async () => {
    const promise = runEngineIsolated("official-mermaid", [smokeFixture], {
      workerPath: resolve(process.cwd(), "tests/fixtures/workers/initialization-error.mjs"),
      timeoutMs: 5_000,
    });

    await expect(promise).resolves.toEqual([
      expect.objectContaining({
        fixtureId: smokeFixture.id,
        engine: "official-mermaid",
        verdict: "engine-error",
        errorFamily: "initialization-error",
        message: "Synthetic initialization failure",
      }),
    ]);
  });
});
