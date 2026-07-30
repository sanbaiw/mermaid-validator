import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { API } from "typescript/unstable/sync";
import { SyntaxKind, type Node, type StringLiteral } from "typescript/unstable/ast";
import {
  isCallExpression,
  isExportDeclaration,
  isImportDeclaration,
  isStringLiteral,
} from "typescript/unstable/ast/is";
import { describe, expect, it } from "vitest";

interface Edge { source: string; specifier: string; target?: string }

function assertModuleEdges(edges: readonly Edge[]): void {
  for (const edge of edges) {
    const nodeBuiltin = edge.specifier.replace(/^node:/, "");
    if (edge.source.startsWith("src/cli/")) {
      expect(
        edge.target === undefined
        || edge.target.startsWith("src/cli/")
        || edge.target === "src/validation/index.ts",
        JSON.stringify(edge),
      ).toBe(true);
    }
    if (edge.source.startsWith("src/lsp/")) {
      expect(
        edge.target === undefined
        || edge.target.startsWith("src/lsp/")
        || edge.target === "src/validation/index.ts",
        JSON.stringify(edge),
      ).toBe(true);
    }
    if (edge.source.startsWith("src/validation/")) {
      expect(edge.target?.startsWith("src/cli/") ?? false, JSON.stringify(edge)).toBe(false);
      expect(edge.target?.startsWith("src/lsp/") ?? false, JSON.stringify(edge)).toBe(false);
      expect(edge.target?.startsWith("src/compatibility/") ?? false, JSON.stringify(edge)).toBe(false);
    }
    if (edge.source.startsWith("src/compatibility/") && edge.target !== undefined) {
      expect(
        edge.target.startsWith("src/compatibility/")
        || edge.target === "src/validation/index.ts",
        JSON.stringify(edge),
      ).toBe(true);
    }
    if (/^src\/validation\/[^/]+\.ts$/.test(edge.source)
      && edge.target?.startsWith("src/validation/canonical-syntax/")) {
      expect(edge.target, JSON.stringify(edge)).toBe("src/validation/canonical-syntax/index.ts");
    }
    if (/^src\/validation\/[^/]+\.ts$/.test(edge.source)
      && edge.target?.startsWith("src/validation/markdown/")) {
      expect(edge.target, JSON.stringify(edge)).toBe("src/validation/markdown/index.ts");
    }
    if (/^src\/validation\/[^/]+\.ts$/.test(edge.source)
      && edge.target?.startsWith("src/validation/rules/")) {
      expect(edge.target, JSON.stringify(edge)).toBe("src/validation/rules/index.ts");
    }
    if (edge.source.startsWith("src/validation/canonical-syntax/") && edge.target !== undefined) {
      expect(edge.target.startsWith("src/validation/canonical-syntax/"), JSON.stringify(edge)).toBe(true);
    }
    if (edge.source.startsWith("src/validation/markdown/") && edge.target !== undefined) {
      expect(edge.target.startsWith("src/validation/markdown/"), JSON.stringify(edge)).toBe(true);
    }
    if (edge.source.startsWith("src/validation/rules/") && edge.target !== undefined) {
      expect(edge.target.startsWith("src/validation/rules/"), JSON.stringify(edge)).toBe(true);
    }
    if ((edge.specifier === "mermaid" || edge.specifier === "jsdom")
      && !edge.source.startsWith("src/compatibility/")) {
      expect(edge.source).toBe("src/validation/canonical-syntax/mermaid-runtime.ts");
    }
    if (edge.specifier === "mdast-util-from-markdown") {
      expect(edge.source).toBe("src/validation/markdown/extract-markdown.ts");
    }
    if (edge.specifier === "globby") expect(edge.source).toBe("src/cli/discovery.ts");
    if (edge.specifier === "commander") expect(edge.source.startsWith("src/cli/")).toBe(true);
    if (edge.specifier === "zod") {
      expect(edge.source).toBe("src/validation/rules/options-schema.ts");
    }
    if (edge.specifier === "vscode-languageserver"
      || edge.specifier.startsWith("vscode-languageserver/")
      || edge.specifier === "vscode-languageserver-textdocument") {
      expect(edge.source.startsWith("src/lsp/"), JSON.stringify(edge)).toBe(true);
    }
    if (edge.specifier === "@mermaid-lint/core" || edge.specifier === "@mermanjs/web") {
      expect(edge.source.startsWith("src/compatibility/engines/")).toBe(true);
    }
    if (edge.source.startsWith("src/validation/rules/")
      && (/^(fs|fs\/promises|path|process)$/.test(nodeBuiltin)
        || edge.specifier === "@mermaid-lint/core"
        || edge.specifier === "@mermanjs/web")) {
      expect.unreachable(`Rules imported a forbidden external capability: ${JSON.stringify(edge)}`);
    }
    if (/^(fs|fs\/promises|path)$/.test(nodeBuiltin)
      && /^src\/validation\/[^/]+\.ts$/.test(edge.source)) {
      expect.unreachable(`root Diagram Validation imported filesystem code: ${JSON.stringify(edge)}`);
    }
    if (edge.source.startsWith("src/lsp/")
      && /^(child_process|fs|fs\/promises|path)$/.test(nodeBuiltin)) {
      expect.unreachable(`LSP imported a forbidden external capability: ${JSON.stringify(edge)}`);
    }
  }
}

function assertAcyclic(edges: readonly Edge[]): void {
  const adjacency = new Map<string, string[]>();
  for (const { source, target } of edges) {
    if (target === undefined) continue;
    const targets = adjacency.get(source) ?? [];
    targets.push(target);
    adjacency.set(source, targets);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (source: string, path: readonly string[]): void => {
    if (visiting.has(source)) throw new Error(`Project import cycle: ${[...path, source].join(" -> ")}`);
    if (visited.has(source)) return;
    visiting.add(source);
    for (const target of adjacency.get(source) ?? []) visit(target, [...path, source]);
    visiting.delete(source);
    visited.add(source);
  };
  for (const source of adjacency.keys()) visit(source, []);
}

describe("module import boundaries", () => {
  it("keeps delivery, validation capabilities, compatibility, and upstream ownership separate", async () => {
    const temporaryRoot = await mkdtemp(resolve(".module-import-boundaries-"));
    await cp(resolve("src"), join(temporaryRoot, "src"), { recursive: true });
    await writeFile(join(temporaryRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2023", module: "NodeNext", moduleResolution: "NodeNext", strict: true, noEmit: true,
      },
      include: ["src/**/*.ts"],
    }));
    const api = new API();
    const snapshot = api.updateSnapshot({ openProjects: [join(temporaryRoot, "tsconfig.json")] });
    try {
      const project = snapshot.getProjects()[0];
      if (!project) throw new Error("TypeScript did not open the build project");
      const edges: Edge[] = [];
      for (const file of project.rootFiles.filter((path) => path.includes(`${sep}src${sep}`))) {
        const sourceFile = project.program.getSourceFile(file);
        if (!sourceFile) throw new Error(`TypeScript did not parse ${file}`);
        const addEdge = (literal: StringLiteral): void => {
          const symbol = project.checker.getSymbolAtLocation(literal);
          const declaration = symbol?.declarations[0]?.resolve(project);
          const targetFile = declaration?.getSourceFile().fileName;
          edges.push({
            source: relative(temporaryRoot, file),
            specifier: literal.text,
            ...(targetFile?.includes(`${sep}src${sep}`)
              ? { target: relative(temporaryRoot, targetFile) }
              : {}),
          });
        };
        const visit = (node: Node): void => {
          if ((isImportDeclaration(node) || isExportDeclaration(node))
            && node.moduleSpecifier && isStringLiteral(node.moduleSpecifier)) addEdge(node.moduleSpecifier);
          if (isCallExpression(node)
            && node.expression.kind === SyntaxKind.ImportKeyword
            && node.arguments.length === 1
            && isStringLiteral(node.arguments[0]!)) addEdge(node.arguments[0]!);
          node.forEachChild(visit);
        };
        visit(sourceFile);
      }
      assertModuleEdges(edges);
      assertAcyclic(edges);
    } finally {
      snapshot.dispose();
      api.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it.each([
    [{ source: "src/cli/main.ts", specifier: "../validation/markdown/index.js", target: "src/validation/markdown/index.ts" }],
    [{ source: "src/validation/markdown/extract-markdown.ts", specifier: "../canonical-syntax/index.js", target: "src/validation/canonical-syntax/index.ts" }],
    [{ source: "src/validation/markdown/offset-map.ts", specifier: "../../cli/main.js", target: "src/cli/main.ts" }],
    [{ source: "src/validation/validate-document.ts", specifier: "node:fs/promises" }],
    [{ source: "src/cli/main.ts", specifier: "globby" }],
    [{ source: "src/compatibility/report.ts", specifier: "../cli/main.js", target: "src/cli/main.ts" }],
    [{ source: "src/compatibility/report.ts", specifier: "../validation/document.js", target: "src/validation/document.ts" }],
    [{ source: "src/cli/main.ts", specifier: "../validation/rules/index.js", target: "src/validation/rules/index.ts" }],
    [{ source: "src/validation/fix-document.ts", specifier: "./rules/fixes.js", target: "src/validation/rules/fixes.ts" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "../../cli/main.js", target: "src/cli/main.ts" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "../../compatibility/contracts.js", target: "src/compatibility/contracts.ts" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "../canonical-syntax/protocol.js", target: "src/validation/canonical-syntax/protocol.ts" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "../markdown/contracts.js", target: "src/validation/markdown/contracts.ts" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "node:fs/promises" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "@mermaid-lint/core" }],
    [{ source: "src/validation/rules/run-rules.ts", specifier: "@mermanjs/web" }],
    [{ source: "src/validation/rules/registry.ts", specifier: "zod" }],
    [{ source: "src/lsp/server.ts", specifier: "../cli/main.js", target: "src/cli/main.ts" }],
    [{ source: "src/lsp/server.ts", specifier: "../validation/document.js", target: "src/validation/document.ts" }],
    [{ source: "src/lsp/server.ts", specifier: "../validation/canonical-syntax/index.js", target: "src/validation/canonical-syntax/index.ts" }],
    [{ source: "src/lsp/server.ts", specifier: "node:fs/promises" }],
    [{ source: "src/lsp/server.ts", specifier: "node:path" }],
    [{ source: "src/lsp/server.ts", specifier: "node:child_process" }],
    [{ source: "src/lsp/server.ts", specifier: "fs" }],
    [{ source: "src/lsp/server.ts", specifier: "fs/promises" }],
    [{ source: "src/lsp/server.ts", specifier: "path" }],
    [{ source: "src/lsp/server.ts", specifier: "child_process" }],
    [{ source: "src/cli/main.ts", specifier: "vscode-languageserver/node" }],
    [{ source: "src/validation/validate-document.ts", specifier: "vscode-languageserver-textdocument" }],
  ])("rejects forbidden active-stage edge %j", (edge) => {
    expect(() => assertModuleEdges([edge])).toThrow();
  });

  it("allows the Stage 4 LSP adapter to use its subtree, validation seam, and owned packages", () => {
    expect(() => assertModuleEdges([
      { source: "src/lsp/server.ts", specifier: "./contracts.js", target: "src/lsp/contracts.ts" },
      { source: "src/lsp/server.ts", specifier: "../validation/index.js", target: "src/validation/index.ts" },
      { source: "src/lsp/server.ts", specifier: "vscode-languageserver/node" },
      { source: "src/lsp/server.ts", specifier: "vscode-languageserver-textdocument" },
    ])).not.toThrow();
  });

  it("rejects a resolved project import cycle", () => {
    expect(() => assertAcyclic([
      { source: "src/a.ts", specifier: "./b.js", target: "src/b.ts" },
      { source: "src/b.ts", specifier: "./a.js", target: "src/a.ts" },
    ])).toThrow(/Project import cycle/);
  });
});
