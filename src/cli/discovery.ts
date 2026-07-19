import { stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { convertPathToPattern, globby } from "globby";
import { CliInputFailure } from "./contracts.js";

const INPUT_PATTERNS = ["**/*.mmd", "**/*.mermaid", "**/*.md"] as const;
const HARD_IGNORES = ["**/.git/**", "**/node_modules/**", "**/dist/**"] as const;
const HARD_DIRECTORY_NAMES = new Set([".git", "node_modules", "dist"]);

function supported(path: string): boolean {
  return [".mmd", ".mermaid", ".md"].includes(extname(path).toLowerCase());
}

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

function liesInHardDirectory(path: string): boolean {
  return resolve(path).split(sep).some((part) => HARD_DIRECTORY_NAMES.has(part));
}

async function scan(options: {
  readonly cwd: string;
  readonly patterns?: readonly string[];
  readonly ignore?: readonly string[];
}): Promise<readonly string[]> {
  return await globby(options.patterns ?? INPUT_PATTERNS, {
    cwd: options.cwd,
    gitignore: true,
    dot: true,
    onlyFiles: true,
    unique: true,
    absolute: true,
    followSymbolicLinks: false,
    caseSensitiveMatch: false,
    ignore: [...HARD_IGNORES, ...(options.ignore ?? [])],
  });
}

async function inspect(path: string): Promise<"file" | "directory"> {
  try {
    const info = await stat(path);
    if (info.isFile()) return "file";
    if (info.isDirectory()) return "directory";
  } catch {
    throw new CliInputFailure(`Input path does not exist: ${path}`);
  }
  throw new CliInputFailure(`Input path is not a file or directory: ${path}`);
}

export async function discoverInputFiles(options: {
  readonly cwd: string;
  readonly configRoot: string;
  readonly explicitPaths: readonly string[];
  readonly ignore?: readonly string[];
}): Promise<readonly string[]> {
  const cwd = resolve(options.cwd);
  const configRoot = resolve(options.configRoot);
  const files = new Set<string>();

  if (options.explicitPaths.length === 0) {
    for (const path of await scan({
      cwd: configRoot,
      ...(options.ignore === undefined ? {} : { ignore: options.ignore }),
    })) {
      if (supported(path)) files.add(resolve(path));
    }
  } else {
    const explicitInputs = new Map<string, string>();
    for (const suppliedPath of options.explicitPaths) {
      const absolutePath = resolve(cwd, suppliedPath);
      if (!explicitInputs.has(absolutePath)) explicitInputs.set(absolutePath, suppliedPath);
    }
    const configRootPatterns = new Set<string>();
    const outsideDirectories: string[] = [];
    for (const [absolutePath, suppliedPath] of explicitInputs) {
      const kind = await inspect(absolutePath);
      if (kind === "file") {
        if (!supported(absolutePath)) {
          throw new CliInputFailure(`Unsupported file extension: ${suppliedPath}`);
        }
        files.add(absolutePath);
        continue;
      }
      if (liesInHardDirectory(absolutePath)) continue;
      if (isWithin(configRoot, absolutePath)) {
        const relativePath = relative(configRoot, absolutePath);
        const directoryPattern = relativePath === "" ? "" : convertPathToPattern(relativePath);
        for (const pattern of INPUT_PATTERNS) {
          configRootPatterns.add(directoryPattern === "" ? pattern : `${directoryPattern}/${pattern}`);
        }
      } else {
        outsideDirectories.push(absolutePath);
      }
    }
    if (configRootPatterns.size > 0) {
      for (const path of await scan({
        cwd: configRoot,
        patterns: [...configRootPatterns],
        ...(options.ignore === undefined ? {} : { ignore: options.ignore }),
      })) {
        if (supported(path)) files.add(resolve(path));
      }
    }
    for (const directory of outsideDirectories) {
      for (const path of await scan({ cwd: directory })) {
        if (supported(path)) files.add(resolve(path));
      }
    }
  }

  const sorted = [...files].sort((left, right) => left.localeCompare(right));
  if (sorted.length === 0) throw new CliInputFailure("No supported input files were discovered");
  return sorted;
}
