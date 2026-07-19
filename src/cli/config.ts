import { open } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { CliInputFailure } from "./contracts.js";

const CONFIG_FILENAME = "mermaid-validator.config.json";

export interface CliConfig {
  readonly ignore?: readonly string[];
}

export interface LoadedCliConfig {
  readonly rootDirectory: string;
  readonly filepath?: string;
  readonly config: CliConfig;
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

function parseConfig(text: string, filepath: string): CliConfig {
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

function readConfigSource(filepath: string, missing: "ignore"): Promise<string | undefined>;
function readConfigSource(filepath: string, missing: "error"): Promise<string>;
async function readConfigSource(
  filepath: string,
  missing: "ignore" | "error",
): Promise<string | undefined> {
  let handle;
  try {
    handle = await open(filepath, "r");
  } catch (error) {
    if (isMissing(error)) {
      if (missing === "ignore") return undefined;
      throw new CliInputFailure(`Config file does not exist: ${filepath}`);
    }
    throw new CliInputFailure(`Unable to read config file: ${filepath}`);
  }

  try {
    if (!(await handle.stat()).isFile()) {
      if (missing === "ignore") return undefined;
      throw new CliInputFailure(`Config path is not a file: ${filepath}`);
    }
    return await handle.readFile({ encoding: "utf8" });
  } catch (error) {
    if (error instanceof CliInputFailure) throw error;
    throw new CliInputFailure(`Unable to read config file: ${filepath}`);
  } finally {
    await handle.close();
  }
}

async function findConfig(cwd: string): Promise<{ readonly filepath: string; readonly source: string } | undefined> {
  let directory = resolve(cwd);
  while (true) {
    const candidate = resolve(directory, CONFIG_FILENAME);
    const source = await readConfigSource(candidate, "ignore");
    if (source !== undefined) return { filepath: candidate, source };
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

export async function loadCliConfig(options: {
  readonly cwd: string;
  readonly explicitPath?: string;
}): Promise<LoadedCliConfig> {
  const cwd = resolve(options.cwd);
  let loaded: { readonly filepath: string; readonly source: string } | undefined;
  if (options.explicitPath === undefined) {
    loaded = await findConfig(cwd);
  } else {
    const filepath = resolve(cwd, options.explicitPath);
    loaded = { filepath, source: await readConfigSource(filepath, "error") };
  }
  if (loaded === undefined) return { rootDirectory: cwd, config: {} };

  return {
    rootDirectory: dirname(loaded.filepath),
    filepath: loaded.filepath,
    config: parseConfig(loaded.source, loaded.filepath),
  };
}
