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
  });
});
