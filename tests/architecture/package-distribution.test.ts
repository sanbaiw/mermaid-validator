import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageManifest {
  readonly name?: string;
  readonly version?: string;
  readonly private?: boolean;
  readonly main?: string;
  readonly types?: string;
  readonly exports?: unknown;
  readonly files?: readonly string[];
  readonly bin?: Record<string, string>;
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly scripts?: Record<string, string>;
  readonly repository?: { readonly type?: string; readonly url?: string };
  readonly publishConfig?: { readonly access?: string };
}

async function manifest(): Promise<PackageManifest> {
  return JSON.parse(await readFile(resolve("package.json"), "utf8")) as PackageManifest;
}

describe("preview npm distribution", () => {
  it("publishes only executable adapters and denies programmatic imports", async () => {
    const packageJson = await manifest();
    expect(packageJson.name).toBe("mermaid-validator");
    expect(packageJson.private).toBe(false);
    expect(packageJson.main).toBeUndefined();
    expect(packageJson.types).toBeUndefined();
    expect(packageJson.exports).toEqual({});
    expect(packageJson.files).toEqual([
      "dist/cli",
      "dist/validation",
      "README.md",
    ]);
    expect(packageJson.bin).toEqual({
      "mermaid-validator": "./dist/cli/main.js",
    });
    expect(packageJson.dependencies).not.toHaveProperty("vscode-languageserver");
    expect(packageJson.dependencies).not.toHaveProperty("vscode-languageserver-textdocument");
    expect(packageJson.devDependencies).toMatchObject({
      "vscode-languageserver": "10.1.0",
      "vscode-languageserver-textdocument": "1.0.12",
    });
  });

  it("binds publication metadata and build lifecycle to this repository", async () => {
    const packageJson = await manifest();
    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/sanbaiw/mermaid-validator.git",
    });
    expect(packageJson.publishConfig).toEqual({ access: "public" });
    expect(packageJson.scripts?.clean).toBe("node scripts/clean-dist.mjs");
    expect(packageJson.scripts?.build).toBe("pnpm clean && tsc -p tsconfig.build.json");
    expect(packageJson.scripts?.prepack).toBe("pnpm build");
    expect(packageJson.scripts?.["package:smoke"]).toBe("node scripts/package-smoke.mjs");
  });

  it("keeps package and published CLI versions synchronized", async () => {
    const packageJson = await manifest();
    const cliSource = await readFile(resolve("src/cli/run-cli.ts"), "utf8");
    expect(cliSource).toContain(`const TOOL_VERSION = "${packageJson.version}";`);
  });

  it("uses trusted publishing without a registry token fallback", async () => {
    const workflow = await readFile(resolve(".github/workflows/publish.yml"), "utf8");
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("npm install -g npm@^11.5.1");
    expect(workflow).toContain('npm publish "${PACKAGE_FILE}" --provenance --access public');
    expect(workflow).toContain("actions/upload-artifact@v6");
    expect(workflow).toContain("if: github.event_name == 'push'");
    expect(workflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN|npm[_-]?token/i);
  });
});
