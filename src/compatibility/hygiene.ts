import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".mmd",
  ".mts",
  ".ts",
  ".yaml",
  ".yml",
]);

async function repositoryFiles(root: string): Promise<string[]> {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  return stdout.split("\0").filter(Boolean).sort();
}

function isTextFile(path: string): boolean {
  return path === ".gitignore" || path === ".nvmrc" || TEXT_EXTENSIONS.has(extname(path));
}

export async function findRepositoryHygieneProblems(root = process.cwd()): Promise<string[]> {
  const problems: string[] = [];
  for (const path of await repositoryFiles(root)) {
    let contents: string | undefined;
    if (isTextFile(path)) {
      try {
        contents = await readFile(resolve(root, path), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
    }
    if (/^(?:src|tests|fixtures)\/.*\.js(?:\.map)?$/.test(path)
      || /^vitest\.config\.js(?:\.map)?$/.test(path)) {
      problems.push(`${path} is a generated JavaScript artifact outside dist/`);
    }
    if (contents === undefined) continue;
    const lines = contents.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/[ \t]+$/.test(line)) problems.push(`${path}:${index + 1} has trailing whitespace`);
    });
  }
  return problems.sort();
}

async function main(): Promise<void> {
  const problems = await findRepositoryHygieneProblems();
  if (problems.length > 0) {
    process.stderr.write(`${problems.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Repository hygiene: clean across tracked and untracked files\n");
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
