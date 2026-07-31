import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const forbiddenPackages = [
  "@mermaid-js/mermaid-cli",
  "playwright",
  "playwright-core",
  "puppeteer",
  "puppeteer-core",
  "sharp",
  "pngjs",
  "pixelmatch",
  "openai",
];

describe("active non-visual dependency boundary", () => {
  it("uses exact direct pins and contains no visual product dependency", async () => {
    const packageJson = JSON.parse(await readFile(resolve("package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    expect(packageJson.optionalDependencies).toBeUndefined();
    const direct = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const version of Object.values(direct)) expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    for (const name of forbiddenPackages) expect(direct).not.toHaveProperty(name);
  });

  it("does not create deferred or later-stage product directories", () => {
    for (const directory of [
      "src/extraction", "src/rules", "src/facts", "src/reporters",
      "src/render", "src/geometry", "src/vision", "src/mcp",
    ]) {
      expect(existsSync(resolve(directory)), directory).toBe(false);
    }
  });
});
