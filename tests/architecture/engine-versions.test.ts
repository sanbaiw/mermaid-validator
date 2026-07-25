import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSIONS } from "../../src/compatibility/versions.js";

describe("evaluated engine versions", () => {
  it("matches the exact direct dependency pins", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const direct = { ...manifest.dependencies, ...manifest.devDependencies };

    expect(ENGINE_VERSIONS).toEqual({
      "official-mermaid": direct.mermaid,
      "mermaid-lint-official": direct["@mermaid-lint/core"],
      "mermaid-lint-aggregate": direct["@mermaid-lint/core"],
      merman: direct["@mermanjs/web"],
    });
    expect(Object.values(ENGINE_VERSIONS).every((version) => /^\d+\.\d+\.\d+$/.test(version))).toBe(true);
    expect(manifest.dependencies).toMatchObject({
      globby: "16.2.2",
      "mdast-util-from-markdown": "2.0.3",
      zod: "4.4.3",
    });
    expect(manifest.devDependencies).toMatchObject({
      "@mermaid-lint/core": "0.35.0",
      "@mermanjs/web": "0.7.0",
    });
    expect(direct).not.toHaveProperty("lilconfig");
    expect(direct).not.toHaveProperty("ajv");
    expect(direct).not.toHaveProperty("minimatch");
    expect(direct).not.toHaveProperty("picomatch");
  });
});
