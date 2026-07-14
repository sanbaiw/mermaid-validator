import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { CompatibilityCase, LoadedCompatibilityCase, TargetDiagramType } from "../../src/spike/contracts.js";

export const compatibilityManifest: CompatibilityCase[] = [
  {
    id: "flowchart-valid-minimal",
    path: "fixtures/compatibility/flowchart/valid-minimal.mmd",
    diagramType: "flowchart",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "baseline"],
    expectedFacts: { type: "flowchart", nodeIds: ["A", "B"], edges: [{ from: "A", to: "B" }] },
  },
  {
    id: "flowchart-valid-modern-shapes",
    path: "fixtures/compatibility/flowchart/valid-modern-shapes.mmd",
    diagramType: "flowchart",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "modern-shape"],
    expectedFacts: { type: "flowchart", nodeIds: ["A", "B"], edges: [{ from: "A", to: "B" }] },
  },
  // Copied from modern-agent/wiki/concepts/prompt-assembly.md around line 38.
  {
    id: "flowchart-valid-real-world-prompt-assembly",
    path: "fixtures/compatibility/flowchart/valid-real-world-prompt-assembly.mmd",
    diagramType: "flowchart",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "real-world"],
    expectedFacts: {
      type: "flowchart",
      nodeIds: ["CLAUDE", "CODEX", "CONTEXT", "CONTRACT", "HISTORY", "META", "REQUEST", "TOOLS"],
      edges: [
        { from: "CONTEXT", to: "REQUEST" }, { from: "CONTRACT", to: "REQUEST" },
        { from: "HISTORY", to: "REQUEST" }, { from: "META", to: "REQUEST" },
        { from: "REQUEST", to: "CLAUDE" }, { from: "REQUEST", to: "CODEX" },
        { from: "TOOLS", to: "REQUEST" },
      ],
    },
  },
  { id: "flowchart-invalid-header", path: "fixtures/compatibility/flowchart/invalid-header.mmd", diagramType: "flowchart", expectedCanonicalVerdict: "rejected", tags: ["invalid", "header"], expectedLocation: "line" },
  { id: "flowchart-invalid-edge", path: "fixtures/compatibility/flowchart/invalid-edge.mmd", diagramType: "flowchart", expectedCanonicalVerdict: "rejected", tags: ["invalid", "relationship"], expectedLocation: "line-column", expectedOfficialDiagnostic: { precision: "approximate", line: [2, 2], column: [4, 4] } },
  { id: "flowchart-invalid-label", path: "fixtures/compatibility/flowchart/invalid-label.mmd", diagramType: "flowchart", expectedCanonicalVerdict: "rejected", tags: ["invalid", "unterminated"], expectedLocation: "line-column" },

  {
    id: "sequence-valid-minimal",
    path: "fixtures/compatibility/sequence/valid-minimal.mmd",
    diagramType: "sequence",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "baseline"],
    expectedFacts: { type: "sequence", participantIds: ["Alice", "Bob"], messages: [{ from: "Alice", to: "Bob" }] },
  },
  {
    id: "sequence-valid-grouping",
    path: "fixtures/compatibility/sequence/valid-grouping.mmd",
    diagramType: "sequence",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "grouping"],
    expectedFacts: {
      type: "sequence",
      participantIds: ["API", "Client", "DB"],
      messages: [
        { from: "API", to: "DB" }, { from: "Client", to: "API" }, { from: "DB", to: "API" },
      ],
    },
  },
  { id: "sequence-invalid-header", path: "fixtures/compatibility/sequence/invalid-header.mmd", diagramType: "sequence", expectedCanonicalVerdict: "rejected", tags: ["invalid", "header"], expectedLocation: "line" },
  { id: "sequence-invalid-message", path: "fixtures/compatibility/sequence/invalid-message.mmd", diagramType: "sequence", expectedCanonicalVerdict: "rejected", tags: ["invalid", "message"], expectedLocation: "line-column", expectedOfficialDiagnostic: { precision: "approximate", line: [2, 2], column: [8, 8] } },
  { id: "sequence-invalid-block", path: "fixtures/compatibility/sequence/invalid-block.mmd", diagramType: "sequence", expectedCanonicalVerdict: "rejected", tags: ["invalid", "unterminated"], expectedLocation: "line-column" },

  {
    id: "pie-valid-minimal",
    path: "fixtures/compatibility/pie/valid-minimal.mmd",
    diagramType: "pie",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "baseline"],
    expectedFacts: { type: "pie", sections: [{ label: "Cats", value: 2 }, { label: "Dogs", value: 3 }] },
  },
  {
    id: "pie-valid-title-show-data",
    path: "fixtures/compatibility/pie/valid-title-show-data.mmd",
    diagramType: "pie",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "title", "show-data"],
    expectedFacts: { type: "pie", sections: [{ label: "Build", value: 40 }, { label: "Review", value: 25 }, { label: "Test", value: 35 }] },
  },
  { id: "pie-invalid-header", path: "fixtures/compatibility/pie/invalid-header.mmd", diagramType: "pie", expectedCanonicalVerdict: "rejected", tags: ["invalid", "header"], expectedLocation: "line" },
  { id: "pie-invalid-section", path: "fixtures/compatibility/pie/invalid-section.mmd", diagramType: "pie", expectedCanonicalVerdict: "rejected", tags: ["invalid", "section"], expectedLocation: "line-column", expectedOfficialDiagnostic: { precision: "document" } },
  { id: "pie-invalid-label", path: "fixtures/compatibility/pie/invalid-label.mmd", diagramType: "pie", expectedCanonicalVerdict: "rejected", tags: ["invalid", "unterminated"], expectedLocation: "line-column" },

  {
    id: "class-valid-minimal",
    path: "fixtures/compatibility/class/valid-minimal.mmd",
    diagramType: "class",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "baseline"],
    expectedFacts: {
      type: "class",
      classes: [{ id: "Animal", memberCount: 1 }, { id: "Dog", memberCount: 0 }],
      relations: [{ from: "Animal", to: "Dog" }],
    },
  },
  {
    id: "class-valid-generic-members",
    path: "fixtures/compatibility/class/valid-generic-members.mmd",
    diagramType: "class",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "generic", "members", "relation"],
    expectedFacts: {
      type: "class",
      classes: [{ id: "Repository", memberCount: 2 }, { id: "User", memberCount: 0 }],
      relations: [{ from: "Repository", to: "User" }],
    },
  },
  { id: "class-invalid-header", path: "fixtures/compatibility/class/invalid-header.mmd", diagramType: "class", expectedCanonicalVerdict: "rejected", tags: ["invalid", "header"], expectedLocation: "line" },
  { id: "class-invalid-relation", path: "fixtures/compatibility/class/invalid-relation.mmd", diagramType: "class", expectedCanonicalVerdict: "rejected", tags: ["invalid", "relationship"], expectedLocation: "line-column" },
  { id: "class-invalid-block", path: "fixtures/compatibility/class/invalid-block.mmd", diagramType: "class", expectedCanonicalVerdict: "rejected", tags: ["invalid", "unterminated"], expectedLocation: "line-column", expectedOfficialDiagnostic: { precision: "approximate", line: [3, 3], column: [1, 1] } },

  {
    id: "state-valid-minimal",
    path: "fixtures/compatibility/state/valid-minimal.mmd",
    diagramType: "state",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "baseline"],
    expectedFacts: {
      type: "state",
      stateIds: ["Idle", "root_end", "root_start"],
      transitions: [{ from: "Idle", to: "root_end" }, { from: "root_start", to: "Idle" }],
    },
  },
  {
    id: "state-valid-composite",
    path: "fixtures/compatibility/state/valid-composite.mmd",
    diagramType: "state",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "state-diagram-v2", "composite"],
    expectedFacts: {
      type: "state",
      stateIds: ["Active", "Waiting", "Working", "root_end", "root_start"],
      transitions: [
        { from: "Active", to: "root_end" }, { from: "root_start", to: "Active" },
        { from: "Waiting", to: "Working" }, { from: "Working", to: "Waiting" },
      ],
    },
  },
  // Copied from modern-agent/wiki/syntheses/codex-prompt-caching-source-code.md around line 105.
  {
    id: "state-valid-real-world-caching",
    path: "fixtures/compatibility/state/valid-real-world-caching.mmd",
    diagramType: "state",
    expectedCanonicalVerdict: "accepted",
    tags: ["valid", "real-world", "state-diagram-v2"],
    expectedFacts: {
      type: "state",
      stateIds: ["LocalCompact", "MidTurnCompact", "NewBaseline", "PreTurnCompact", "RemoteCompact", "ReplaceHistory", "StandaloneTurn", "SteadyState", "TrimOldest", "root_start"],
      transitions: [
        { from: "LocalCompact", to: "ReplaceHistory" }, { from: "LocalCompact", to: "TrimOldest" },
        { from: "MidTurnCompact", to: "LocalCompact" }, { from: "MidTurnCompact", to: "RemoteCompact" },
        { from: "NewBaseline", to: "SteadyState" }, { from: "PreTurnCompact", to: "LocalCompact" },
        { from: "PreTurnCompact", to: "RemoteCompact" }, { from: "RemoteCompact", to: "ReplaceHistory" },
        { from: "ReplaceHistory", to: "NewBaseline" }, { from: "root_start", to: "SteadyState" },
        { from: "StandaloneTurn", to: "LocalCompact" },
        { from: "StandaloneTurn", to: "RemoteCompact" }, { from: "SteadyState", to: "MidTurnCompact" },
        { from: "SteadyState", to: "PreTurnCompact" }, { from: "SteadyState", to: "StandaloneTurn" },
        { from: "TrimOldest", to: "LocalCompact" },
      ],
    },
  },
  { id: "state-invalid-header", path: "fixtures/compatibility/state/invalid-header.mmd", diagramType: "state", expectedCanonicalVerdict: "rejected", tags: ["invalid", "header"], expectedLocation: "line" },
  { id: "state-invalid-transition", path: "fixtures/compatibility/state/invalid-transition.mmd", diagramType: "state", expectedCanonicalVerdict: "rejected", tags: ["invalid", "transition"], expectedLocation: "line-column", expectedOfficialDiagnostic: { precision: "approximate", line: [2, 2], column: [8, 8] } },
  { id: "state-invalid-block", path: "fixtures/compatibility/state/invalid-block.mmd", diagramType: "state", expectedCanonicalVerdict: "rejected", tags: ["invalid", "unterminated"], expectedLocation: "line-column" },
];

function assertManifestEntry(entry: CompatibilityCase, seen: Set<string>, root: string): void {
  if (seen.has(entry.id)) throw new Error(`Duplicate compatibility fixture id: ${entry.id}`);
  seen.add(entry.id);
  const expectedSegment = `${sep}${entry.diagramType}${sep}`;
  const absolutePath = resolve(root, entry.path);
  if (!absolutePath.includes(expectedSegment)) {
    throw new Error(`Fixture ${entry.id} path does not match diagram type ${entry.diagramType}`);
  }
}

export async function loadCompatibilityCorpus(root = process.cwd()): Promise<LoadedCompatibilityCase[]> {
  const seen = new Set<string>();
  return await Promise.all(compatibilityManifest.map(async (entry) => {
    assertManifestEntry(entry, seen, root);
    const source = await readFile(resolve(root, entry.path), "utf8").catch((error: unknown) => {
      throw new Error(`Cannot read compatibility fixture ${entry.id}: ${error instanceof Error ? error.message : String(error)}`);
    });
    if (!source.trim()) throw new Error(`Compatibility fixture ${entry.id} is empty`);
    return { ...entry, source };
  }));
}

export function countByTypeAndVerdict(): Record<TargetDiagramType, { accepted: number; rejected: number }> {
  const counts = Object.fromEntries(
    (["flowchart", "sequence", "pie", "class", "state"] as const).map((type) => [type, { accepted: 0, rejected: 0 }]),
  ) as Record<TargetDiagramType, { accepted: number; rejected: number }>;
  for (const entry of compatibilityManifest) counts[entry.diagramType][entry.expectedCanonicalVerdict] += 1;
  return counts;
}
