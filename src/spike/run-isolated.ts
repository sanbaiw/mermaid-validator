import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type { EngineId, EngineObservation, LoadedCompatibilityCase, WorkerRequest } from "./contracts.js";
import { engineFailureObservations } from "./normalize.js";
import { ENGINE_VERSIONS } from "./versions.js";

function isEngineObservation(
  value: unknown,
  engine: EngineId,
  fixtureId: string,
): value is EngineObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.fixtureId === fixtureId
    && record.engine === engine
    && typeof record.engineVersion === "string"
    && ["accepted", "rejected", "unsupported", "engine-error"].includes(String(record.verdict))
    && ["exact", "approximate", "document"].includes(String(record.locationPrecision));
}

export async function runEngineIsolated(
  engine: EngineId,
  fixtures: LoadedCompatibilityCase[],
  options: { workerPath?: string; timeoutMs?: number } = {},
): Promise<EngineObservation[]> {
  const workerPath = options.workerPath ?? resolve(process.cwd(), "dist/spike/worker.js");
  const timeoutMs = options.timeoutMs ?? 30_000;
  const request: WorkerRequest = { engine, fixtures };

  return await new Promise((resolveResult) => {
    const child = spawn(process.execPath, [workerPath], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (observations: EngineObservation[]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(observations);
    };

    const failure = (message: string): EngineObservation[] =>
      engineFailureObservations(engine, ENGINE_VERSIONS[engine], fixtures, message);

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(failure(`Worker timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", (error) => finish(failure(error.message)));
    child.on("close", (code, signal) => {
      if (settled) return;
      if (code !== 0 || signal) {
        finish(failure(`Worker exited ${signal ? `with signal ${signal}` : `with code ${code ?? "unknown"}`}${stderr.trim() ? `: ${stderr.trim()}` : ""}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as unknown;
        if (!Array.isArray(parsed) || parsed.length !== fixtures.length) {
          finish(failure("Worker returned malformed observation cardinality"));
          return;
        }
        const invalidIndex = parsed.findIndex(
          (observation, index) => !isEngineObservation(observation, engine, fixtures[index]!.id),
        );
        if (invalidIndex !== -1) {
          finish(failure(`Worker returned malformed observation at index ${invalidIndex}`));
          return;
        }
        finish(parsed as EngineObservation[]);
      } catch {
        finish(failure("Worker returned malformed JSON"));
      }
    });

    child.stdin.end(JSON.stringify(request));
  });
}
