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

function assertStage1Edges(edges: readonly Edge[]): void {
  for (const edge of edges) {
    if (edge.source.startsWith("src/cli/")) {
      expect(
        edge.target === undefined
        || edge.target.startsWith("src/cli/")
        || edge.target === "src/validation/index.ts",
        JSON.stringify(edge),
      ).toBe(true);
    }
    if (edge.source.startsWith("src/validation/")) {
      expect(edge.target?.startsWith("src/cli/") ?? false, JSON.stringify(edge)).toBe(false);
      expect(edge.target?.startsWith("src/compatibility/") ?? false, JSON.stringify(edge)).toBe(false);
    }
    if (/^src\/validation\/[^/]+\.ts$/.test(edge.source)
      && edge.target?.startsWith("src/validation/canonical-syntax/")) {
      expect(edge.target, JSON.stringify(edge)).toBe("src/validation/canonical-syntax/index.ts");
    }
    if (edge.source.startsWith("src/validation/canonical-syntax/") && edge.target !== undefined) {
      expect(edge.target.startsWith("src/validation/canonical-syntax/"), JSON.stringify(edge)).toBe(true);
    }
    if ((edge.specifier === "mermaid" || edge.specifier === "jsdom")
      && !edge.source.startsWith("src/compatibility/")) {
      expect(edge.source).toBe("src/validation/canonical-syntax/mermaid-runtime.ts");
    }
    if (edge.specifier === "commander") expect(edge.source.startsWith("src/cli/")).toBe(true);
  }
}

describe("Stage 1 import boundaries", () => {
  it("keeps delivery, validation, compatibility, and upstream engine ownership separate", async () => {
    const temporaryRoot = await mkdtemp(resolve(".stage1-import-boundaries-"));
    await cp(resolve("src"), join(temporaryRoot, "src"), { recursive: true });
    await writeFile(join(temporaryRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2023",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
      },
      include: ["src/**/*.ts"],
    }));
    const api = new API();
    const snapshot = api.updateSnapshot({ openProjects: [join(temporaryRoot, "tsconfig.json")] });
    try {
      const project = snapshot.getProjects()[0];
      if (!project) throw new Error("TypeScript did not open the Stage 1 build project");
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
            && node.moduleSpecifier
            && isStringLiteral(node.moduleSpecifier)) {
            addEdge(node.moduleSpecifier);
          }
          if (isCallExpression(node)
            && node.expression.kind === SyntaxKind.ImportKeyword
            && node.arguments.length === 1
            && isStringLiteral(node.arguments[0]!)) {
            addEdge(node.arguments[0]!);
          }
          node.forEachChild(visit);
        };
        visit(sourceFile);
      }

      assertStage1Edges(edges);
    } finally {
      snapshot.dispose();
      api.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("rejects a Canonical Syntax import from a delivery adapter", () => {
    expect(() => assertStage1Edges([{
      source: "src/validation/canonical-syntax/worker-host.ts",
      specifier: "../../cli/main.js",
      target: "src/cli/main.ts",
    }])).toThrow();
  });
});
