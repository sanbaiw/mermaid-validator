import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, parse, resolve } from "node:path";
import { CliInputFailure } from "./contracts.js";

const CONFIG_FILENAME = "mermaid-validator.config.json";

export interface Stage2CliConfig {
  readonly ignore?: readonly string[];
}

export interface LoadedCliConfig {
  readonly rootDirectory: string;
  readonly filepath?: string;
  readonly config: Stage2CliConfig;
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && (error as { code?: unknown }).code === "ENOENT";
}

function validIgnorePattern(pattern: string): boolean {
  if (pattern.length === 0
    || pattern.startsWith("!")
    || isAbsolute(pattern)
    || /^[/\\]|^[A-Za-z]:/.test(pattern)
    || pattern.includes("\\")
    || /[{}[\]()]/.test(pattern)
    || pattern.includes("\0")
    || pattern.split("/").includes("..")) return false;
  return true;
}

function parseConfig(text: string, filepath: string): Stage2CliConfig {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CliInputFailure(`Invalid JSON in config file: ${filepath}`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CliInputFailure(`Invalid config shape: ${filepath}`);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== "ignore")) {
    throw new CliInputFailure(`Unknown config field in: ${filepath}`);
  }
  if (record.ignore === undefined) return {};
  if (!Array.isArray(record.ignore)
    || record.ignore.some((item) => typeof item !== "string" || !validIgnorePattern(item))) {
    throw new CliInputFailure(`Invalid ignore pattern in config file: ${filepath}`);
  }
  return { ignore: record.ignore as string[] };
}

async function findConfig(cwd: string): Promise<string | undefined> {
  let directory = resolve(cwd);
  while (true) {
    const candidate = resolve(directory, CONFIG_FILENAME);
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch (error) {
      if (!isMissing(error)) throw new CliInputFailure(`Unable to inspect config file: ${candidate}`);
    }
    const parent = dirname(directory);
    if (parent === directory || directory === parse(directory).root) return undefined;
    directory = parent;
  }
}

export async function loadCliConfig(options: {
  readonly cwd: string;
  readonly explicitPath?: string;
}): Promise<LoadedCliConfig> {
  const cwd = resolve(options.cwd);
  const filepath = options.explicitPath === undefined
    ? await findConfig(cwd)
    : resolve(cwd, options.explicitPath);
  if (filepath === undefined) return { rootDirectory: cwd, config: {} };

  let source: string;
  try {
    const info = await stat(filepath);
    if (!info.isFile()) throw new CliInputFailure(`Config path is not a file: ${filepath}`);
    source = await readFile(filepath, "utf8");
  } catch (error) {
    if (error instanceof CliInputFailure) throw error;
    if (isMissing(error)) throw new CliInputFailure(`Config file does not exist: ${filepath}`);
    throw new CliInputFailure(`Unable to read config file: ${filepath}`);
  }
  return {
    rootDirectory: dirname(filepath),
    filepath,
    config: parseConfig(source, filepath),
  };
}
