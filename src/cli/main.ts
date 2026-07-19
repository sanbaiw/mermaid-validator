#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import { validateDocument, type DocumentSnapshot } from "../validation/index.js";
import { loadCliConfig } from "./config.js";
import { CliInputFailure, type CliInputError, type ValidatedDocument } from "./contracts.js";
import { discoverInputFiles } from "./discovery.js";
import { formatJsonV2 } from "./json-v2-output.js";
import { formatTerminal } from "./terminal-output.js";

const TOOL_VERSION = "0.1.0";
type ExitCode = 0 | 1 | 2 | 3;

export interface CliDependencies {
  readonly validate: typeof validateDocument;
  readonly loadConfig: typeof loadCliConfig;
  readonly discover: typeof discoverInputFiles;
  readonly readFile: typeof import("node:fs/promises").readFile;
  readonly cwd: () => string;
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

const defaults: CliDependencies = {
  validate: validateDocument,
  loadConfig: loadCliConfig,
  discover: discoverInputFiles,
  readFile,
  cwd: process.cwd,
  stdout: process.stdout,
  stderr: process.stderr,
};

function exitCodeFor(documents: readonly ValidatedDocument[], inputErrors: readonly CliInputError[]): ExitCode {
  const findings = documents.flatMap((item) => item.result.findings);
  if (findings.some((finding) => finding.source === "system" && finding.severity === "error")) return 3;
  if (inputErrors.length > 0) return 2;
  if (findings.some((finding) => finding.severity === "error")) return 1;
  return 0;
}

function formatOption(value: string): "terminal" | "json" {
  if (value === "terminal" || value === "json") return value;
  throw new InvalidArgumentError("must be either 'terminal' or 'json'");
}

function languageId(path: string): DocumentSnapshot["languageId"] {
  return extname(path).toLowerCase() === ".md" ? "markdown" : "mermaid";
}

export async function runCli(
  argv: readonly string[],
  dependencies: Partial<CliDependencies> = {},
): Promise<ExitCode> {
  const io = { ...defaults, ...dependencies };
  let wroteError = false;
  const program = new Command()
    .name("mermaid-validator")
    .description("Validate Mermaid diagrams in files and documentation repositories")
    .argument("[paths...]", "files or directories to validate")
    .option("--config <path>", "use exactly this configuration file")
    .option("--format <format>", "output format: terminal or json", formatOption, "terminal")
    .version(TOOL_VERSION)
    .showHelpAfterError(false)
    .showSuggestionAfterError(false)
    .configureOutput({
      writeOut: (text) => { io.stdout.write(text); },
      writeErr: (text) => { wroteError = true; io.stderr.write(text); },
    })
    .exitOverride();

  try {
    await program.parseAsync([...argv], { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      if (error.exitCode === 0) return 0;
      if (!wroteError) io.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }

  const [paths = []] = program.processedArgs as [string[]?];
  const options = program.opts<{ format: "terminal" | "json"; config?: string }>();
  const cwd = resolve(io.cwd());
  let discovered: readonly string[];
  try {
    const loaded = await io.loadConfig({
      cwd,
      ...(options.config === undefined ? {} : { explicitPath: options.config }),
    });
    discovered = await io.discover({
      cwd,
      configRoot: loaded.rootDirectory,
      explicitPaths: paths,
      ...(loaded.config.ignore === undefined ? {} : { ignore: loaded.config.ignore }),
    });
  } catch (error) {
    const message = error instanceof CliInputFailure || error instanceof Error
      ? error.message
      : "Unable to resolve input files";
    io.stderr.write(`${message}\n`);
    return 2;
  }

  const snapshots: DocumentSnapshot[] = [];
  const inputErrors: CliInputError[] = [];
  for (const path of discovered) {
    try {
      snapshots.push({
        uri: pathToFileURL(path).href,
        languageId: languageId(path),
        text: await io.readFile(path, "utf8"),
      });
    } catch {
      inputErrors.push({ code: "input/read-failed", path, message: "Unable to read input file" });
    }
  }
  for (const error of inputErrors.sort((left, right) => left.path.localeCompare(right.path))) {
    io.stderr.write(`${error.path}: ${error.message}\n`);
  }

  const documents: ValidatedDocument[] = [];
  for (const document of snapshots) {
    documents.push({ document, result: await io.validate(document) });
  }
  const output = options.format === "json"
    ? formatJsonV2(documents, inputErrors, TOOL_VERSION)
    : documents.map(({ document, result }) => formatTerminal(result, document.text)).join("");
  if (output) io.stdout.write(output);
  return exitCodeFor(documents, inputErrors);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
