import type { CompatibilityAdapter, EngineId, EngineObservation, LoadedCompatibilityCase, WorkerRequest } from "./contracts.js";
import { conciseMessage } from "./normalize.js";

async function adapterFor(engine: EngineId): Promise<CompatibilityAdapter> {
  switch (engine) {
    case "official-mermaid":
      return (await import("./engines/official-mermaid.js")).officialMermaidAdapter;
    case "mermaid-lint-official":
      return (await import("./engines/mermaid-lint.js")).mermaidLintOfficialAdapter;
    case "mermaid-lint-aggregate":
      return (await import("./engines/mermaid-lint.js")).mermaidLintAggregateAdapter;
    case "merman":
      return (await import("./engines/merman.js")).mermanAdapter;
  }
}

function failedObservation(
  engine: EngineId,
  version: string,
  fixture: LoadedCompatibilityCase,
  error: unknown,
): EngineObservation {
  return {
    fixtureId: fixture.id,
    engine,
    engineVersion: version,
    verdict: "engine-error",
    errorFamily: "unknown-engine-error",
    message: conciseMessage(error),
    diagramType: fixture.diagramType,
    locationPrecision: "document",
  };
}

async function main(): Promise<void> {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const request = JSON.parse(input) as WorkerRequest;
  const adapter = await adapterFor(request.engine);
  const observations: EngineObservation[] = [];
  for (const fixture of request.fixtures) {
    try {
      observations.push(await adapter.observe(fixture));
    } catch (error) {
      observations.push(failedObservation(adapter.id, adapter.version, fixture, error));
    }
  }
  process.stdout.write(JSON.stringify(observations));
}

await main();
