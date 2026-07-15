#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import { validateDocument, type ValidationResult } from "../validation/index.js";
import { formatJsonV1 } from "./json-v1-output.js";
import { formatTerminal } from "./terminal-output.js";

const TOOL_VERSION = "0.1.0";
type ExitCode = 0 | 1 | 2 | 3;

export interface CliDependencies {
  readonly validate: typeof validateDocument;
  readonly readFile: typeof import("node:fs/promises").readFile;
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

const defaults: CliDependencies = {
  validate: validateDocument,
  readFile,
  stdout: process.stdout,
  stderr: process.stderr,
};

function exitCodeFor(result: ValidationResult): ExitCode {
  if (result.findings.some((finding) => finding.source === "system" && finding.severity === "error")) return 3;
  if (result.findings.some((finding) => finding.severity === "error")) return 1;
  return 0;
}

function formatOption(value: string): "terminal" | "json" {
  if (value === "terminal" || value === "json") return value;
  throw new InvalidArgumentError("must be either 'terminal' or 'json'");
}

export async function runCli(
  argv: readonly string[],
  dependencies: Partial<CliDependencies> = {},
): Promise<ExitCode> {
  const io = { ...defaults, ...dependencies };
  let wroteError = false;
  const program = new Command()
    .name("mermaid-validator")
    .description("Validate one standalone Mermaid diagram with the canonical Mermaid parser")
    .argument("<file>", "path to a .mmd or .mermaid file")
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

  const [file] = program.processedArgs as [string];
  const format = program.opts<{ format: "terminal" | "json" }>().format;
  const absolutePath = resolve(file);
  if (!new Set([".mmd", ".mermaid"]).has(extname(absolutePath).toLowerCase())) {
    io.stderr.write(`Unsupported file extension: ${file}\n`);
    return 2;
  }

  let source: string;
  try {
    source = await io.readFile(absolutePath, "utf8");
  } catch {
    io.stderr.write(`Cannot read Mermaid file: ${absolutePath}\n`);
    return 2;
  }

  const validationResult = await io.validate({
    uri: pathToFileURL(absolutePath).href,
    languageId: "mermaid",
    text: source,
  });
  const output = format === "json"
    ? formatJsonV1(validationResult, TOOL_VERSION)
    : formatTerminal(validationResult, source);
  if (output) io.stdout.write(output);
  return exitCodeFor(validationResult);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
