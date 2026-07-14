import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { findRepositoryHygieneProblems } from "../../src/spike/hygiene.js";

const execFileAsync = promisify(execFile);
let temporaryRoot: string | undefined;

afterEach(async () => {
  if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe("repository hygiene", () => {
  it("checks untracked files for generated source artifacts and trailing whitespace", async () => {
    temporaryRoot = await mkdtemp(join(tmpdir(), "mermaid-validator-hygiene-"));
    await execFileAsync("git", ["init", "--quiet"], { cwd: temporaryRoot });
    await mkdir(join(temporaryRoot, "src"));
    await writeFile(join(temporaryRoot, "src", "generated.js"), "export {};\n");
    await writeFile(join(temporaryRoot, "notes.md"), "trailing space  \n");

    await expect(findRepositoryHygieneProblems(temporaryRoot)).resolves.toEqual([
      "notes.md:1 has trailing whitespace",
      "src/generated.js is a generated JavaScript artifact under src/",
    ]);
  });
});
