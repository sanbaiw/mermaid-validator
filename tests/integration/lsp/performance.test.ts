import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { StdioLspClient } from "../../helpers/lsp/stdio-client.js";

const execFileAsync = promisify(execFile);
const profile = process.env.MERMAID_VALIDATOR_LSP_PROFILE === "1";

interface PublishDiagnostics {
  readonly uri: string;
  readonly version: number;
  readonly diagnostics: readonly unknown[];
}

function summary(samples: readonly number[]): { readonly median: number; readonly min: number; readonly max: number } {
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    median: sorted[Math.floor(sorted.length / 2)]!,
    min: sorted[0]!,
    max: sorted.at(-1)!,
  };
}

async function initialize(client: StdioLspClient): Promise<void> {
  await client.request("initialize", {
    processId: null,
    rootUri: null,
    capabilities: {},
    initializationOptions: { debounceMs: 0 },
  });
  client.notify("initialized", {});
}

describe("LSP performance characterization", () => {
  it.skipIf(!profile)("records cold first-diagnostic and warm same-process samples", async () => {
    const cold: number[] = [];
    const sourceA = "flowchart LR\nA[\"`# Build`\"]\n";
    const sourceB = "flowchart LR\nA[\"`# BuilD`\"]\n";
    for (let index = 0; index < 3; index += 1) {
      const client = new StdioLspClient();
      try {
        await initialize(client);
        const uri = `profile:cold-${index}`;
        const started = performance.now();
        client.notify("textDocument/didOpen", {
          textDocument: { uri, languageId: "mermaid", version: 1, text: sourceA },
        });
        await client.waitForNotification<PublishDiagnostics>(
          "textDocument/publishDiagnostics",
          (params) => params.uri === uri && params.version === 1,
        );
        cold.push(performance.now() - started);
        await client.shutdown();
      } finally {
        await client.dispose();
      }
    }

    const warm: number[] = [];
    const client = new StdioLspClient();
    try {
      await initialize(client);
      const uri = "profile:warm";
      client.notify("textDocument/didOpen", {
        textDocument: { uri, languageId: "mermaid", version: 1, text: sourceA },
      });
      await client.waitForNotification<PublishDiagnostics>(
        "textDocument/publishDiagnostics",
        (params) => params.uri === uri && params.version === 1,
      );
      for (let version = 2; version <= 6; version += 1) {
        const started = performance.now();
        client.notify("textDocument/didChange", {
          textDocument: { uri, version },
          contentChanges: [{ text: version % 2 === 0 ? sourceB : sourceA }],
        });
        await client.waitForNotification<PublishDiagnostics>(
          "textDocument/publishDiagnostics",
          (params) => params.uri === uri && params.version === version,
        );
        warm.push(performance.now() - started);
      }
      await client.shutdown();
    } finally {
      await client.dispose();
    }

    const [{ stdout: commit }, { stdout: pnpmVersion }] = await Promise.all([
      execFileAsync("git", ["rev-parse", "--short", "HEAD"]),
      execFileAsync("pnpm", ["--version"]),
    ]);
    const evidence = {
      coldMs: cold.map((sample) => Number(sample.toFixed(1))),
      coldSummaryMs: summary(cold),
      warmMs: warm.map((sample) => Number(sample.toFixed(1))),
      warmSummaryMs: summary(warm),
      node: process.version,
      pnpm: pnpmVersion.trim(),
      commit: commit.trim(),
      sourceUtf16Units: sourceA.length,
      diagrams: 1,
      debounceMs: 0,
      caches: "mixed OS/filesystem caches",
    };
    process.stdout.write(`LSP_PROFILE ${JSON.stringify(evidence)}\n`);
    expect(cold).toHaveLength(3);
    expect(warm).toHaveLength(5);
    expect([...cold, ...warm].every(Number.isFinite)).toBe(true);
  }, 90_000);
});
