import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSIONS } from "../../src/spike/versions.js";

describe("evaluated engine versions", () => {
  it("matches the exact direct dependency pins", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
    };

    expect(ENGINE_VERSIONS).toEqual({
      "official-mermaid": manifest.dependencies?.mermaid,
      "mermaid-lint-official": manifest.dependencies?.["@mermaid-lint/core"],
      "mermaid-lint-aggregate": manifest.dependencies?.["@mermaid-lint/core"],
      merman: manifest.dependencies?.["@mermanjs/web"],
    });
    expect(Object.values(ENGINE_VERSIONS).every((version) => /^\d+\.\d+\.\d+$/.test(version))).toBe(true);
  });
});
