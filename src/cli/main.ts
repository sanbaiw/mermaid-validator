#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { realpathSync } from "node:fs";
import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Command, CommanderError, InvalidArgumentError, Option } from "commander";
import {
  planDocumentFixes,
  validateDocument,
  type DocumentSnapshot,
  type ResolvedRuleConfiguration,
} from "../validation/index.js";
import { loadCliConfig, rulesForPath, type LoadedCliConfig } from "./config.js";
import { CliInputFailure, type CliInputError, type ValidatedDocument } from "./contracts.js";
import { discoverInputFiles } from "./discovery.js";
import { formatJsonV2 } from "./json-v2-output.js";
import { formatTerminal } from "./terminal-output.js";

const TOOL_VERSION = "0.3.0";
const FILE_READ_CONCURRENCY = 16;
type ExitCode = 0 | 1 | 2 | 3;

export interface CliDependencies {
  readonly validate: typeof validateDocument;
  readonly planFixes: typeof planDocumentFixes;
  readonly loadConfig: typeof loadCliConfig;
  readonly discover: typeof discoverInputFiles;
  readonly readFile: typeof import("node:fs/promises").readFile;
  readonly replaceFile: (path: string, text: string) => Promise<void>;
  readonly cwd: () => string;
  readonly stdout: Pick<NodeJS.WriteStream, "write">;
  readonly stderr: Pick<NodeJS.WriteStream, "write">;
}

export interface AtomicReplaceDependencies {
  readonly open: typeof import("node:fs/promises").open;
  readonly rename: typeof import("node:fs/promises").rename;
  readonly stat: typeof import("node:fs/promises").stat;
  readonly unlink: typeof import("node:fs/promises").unlink;
  readonly createTemporaryPath: (path: string) => string;
}

const atomicReplaceDefaults: AtomicReplaceDependencies = {
  open,
  rename,
  stat,
  unlink,
  createTemporaryPath: (path) => join(
    dirname(path),
    `.${basename(path)}.mermaid-validator-${process.pid}-${randomUUID()}.tmp`,
  ),
};

export async function replaceFileAtomically(
  path: string,
  text: string,
  dependencies: Partial<AtomicReplaceDependencies> = {},
): Promise<void> {
  const io = { ...atomicReplaceDefaults, ...dependencies };
  const metadata = await io.stat(path);
  const temporaryPath = io.createTemporaryPath(path);
  let temporaryFile: Awaited<ReturnType<AtomicReplaceDependencies["open"]>> | undefined;
  let ownsTemporaryPath = false;
  try {
    temporaryFile = await io.open(temporaryPath, "wx", metadata.mode & 0o7777);
    ownsTemporaryPath = true;
    await temporaryFile.writeFile(text, { encoding: "utf8" });
    await temporaryFile.chmod(metadata.mode & 0o7777);
    await temporaryFile.sync();
    await temporaryFile.close();
    temporaryFile = undefined;
    await io.rename(temporaryPath, path);
    ownsTemporaryPath = false;
  } catch (error) {
    if (temporaryFile !== undefined) {
      try {
        await temporaryFile.close();
      } catch {
        // Preserve the operation that caused the replacement to fail.
      }
    }
    if (ownsTemporaryPath) {
      try {
        await io.unlink(temporaryPath);
      } catch {
        // A failed cleanup must not obscure the bounded write failure.
      }
    }
    throw error;
  }
}

const defaults: CliDependencies = {
  validate: validateDocument,
  planFixes: planDocumentFixes,
  loadConfig: loadCliConfig,
  discover: discoverInputFiles,
  readFile,
  replaceFile: replaceFileAtomically,
  cwd: process.cwd,
  stdout: process.stdout,
  stderr: process.stderr,
};

function exitCodeFor(documents: readonly ValidatedDocument[], inputErrors: readonly CliInputError[]): ExitCode {
  if (documents.some((item) => item.result.findings.some((finding) => (
    finding.source === "system" && finding.severity === "error"
  )))) return 3;
  if (inputErrors.length > 0) return 2;
  if (documents.some((item) => item.result.findings.some((finding) => finding.severity === "error"))) return 1;
  return 0;
}

function formatOption(value: string): "terminal" | "json" {
  if (value === "terminal" || value === "json") return value;
  throw new InvalidArgumentError("must be either 'terminal' or 'json'");
}

function languageId(path: string): DocumentSnapshot["languageId"] {
  return extname(path).toLowerCase() === ".md" ? "markdown" : "mermaid";
}

async function readSnapshots(
  paths: readonly string[],
  read: CliDependencies["readFile"],
): Promise<{ readonly snapshots: DocumentSnapshot[]; readonly inputErrors: CliInputError[] }> {
  const snapshots: DocumentSnapshot[] = [];
  const inputErrors: CliInputError[] = [];
  for (let offset = 0; offset < paths.length; offset += FILE_READ_CONCURRENCY) {
    const batch = await Promise.all(paths.slice(offset, offset + FILE_READ_CONCURRENCY).map(async (path) => {
      try {
        return {
          kind: "snapshot" as const,
          value: {
            uri: pathToFileURL(path).href,
            languageId: languageId(path),
            text: await read(path, "utf8"),
          },
        };
      } catch {
        return {
          kind: "input-error" as const,
          value: { code: "input/read-failed" as const, path, message: "Unable to read input file" as const },
        };
      }
    }));
    for (const item of batch) {
      if (item.kind === "snapshot") snapshots.push(item.value);
      else inputErrors.push(item.value);
    }
  }
  return { snapshots, inputErrors };
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
    .addOption(new Option("--fix", "apply safe fixes").conflicts("fixDryRun"))
    .addOption(new Option("--fix-dry-run", "preview safe fixes without writing").conflicts("fix"))
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
  const options = program.opts<{
    format: "terminal" | "json";
    config?: string;
    fix?: boolean;
    fixDryRun?: boolean;
  }>();
  const cwd = resolve(io.cwd());
  let discovered: readonly string[];
  let loaded: LoadedCliConfig;
  try {
    loaded = await io.loadConfig({
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
    const message = error instanceof CliInputFailure ? error.message : "Unable to resolve input files";
    io.stderr.write(`${message}\n`);
    return 2;
  }

  const { snapshots, inputErrors } = await readSnapshots(discovered, io.readFile);
  const documents: ValidatedDocument[] = [];
  const fixMode = options.fix === true || options.fixDryRun === true;
  if (!fixMode) {
    for (const document of snapshots) {
      const rules: ResolvedRuleConfiguration = rulesForPath(loaded, fileURLToPath(document.uri));
      documents.push({ document, result: await io.validate(document, { rules }) });
    }
  } else {
    const planned = [];
    for (const document of snapshots) {
      const rules: ResolvedRuleConfiguration = rulesForPath(loaded, fileURLToPath(document.uri));
      planned.push({ document, plan: await io.planFixes(document, { rules }) });
    }
    planned.sort((left, right) => fileURLToPath(left.document.uri).localeCompare(fileURLToPath(right.document.uri)));
    for (const { document, plan } of planned) {
      if (plan.status !== "changed") {
        documents.push({
          document,
          result: plan.failureResult ?? plan.originalResult,
          fix: { status: plan.status === "unchanged" ? "unchanged" : "blocked", plan },
        });
        continue;
      }
      if (options.fixDryRun === true) {
        documents.push({ document, result: plan.originalResult, fix: { status: "previewed", plan } });
        continue;
      }
      try {
        await io.replaceFile(fileURLToPath(document.uri), plan.output!);
        documents.push({ document, result: plan.proposedResult!, fix: { status: "applied", plan } });
      } catch {
        const path = fileURLToPath(document.uri);
        inputErrors.push({ code: "input/write-failed", path, message: "Unable to write input file" });
        documents.push({ document, result: plan.originalResult, fix: { status: "write-failed", plan } });
      }
    }
  }
  for (const error of inputErrors.sort((left, right) => left.path.localeCompare(right.path))) {
    io.stderr.write(`${error.path}: ${error.message}\n`);
  }
  const output = options.format === "json"
    ? formatJsonV2(documents, inputErrors, TOOL_VERSION)
    : documents.map(({ document, result, fix }) => {
        const source = fix?.status === "applied" ? fix.plan.output! : document.text;
        const diagnostics = formatTerminal(result, source);
        if (fix?.status !== "previewed" && fix?.status !== "applied") return diagnostics;
        const path = fileURLToPath(document.uri);
        const verb = fix.status === "previewed" ? "would apply" : "applied";
        return `${diagnostics}${path}: ${verb} ${fix.plan.edits.length} safe edit(s)\n`;
      }).join("");
  if (output) io.stdout.write(output);
  return exitCodeFor(documents, inputErrors);
}

const entryPath = process.argv[1];
let directEntryUrl: string | undefined;
if (entryPath) {
  try {
    directEntryUrl = pathToFileURL(realpathSync(resolve(entryPath))).href;
  } catch {
    directEntryUrl = pathToFileURL(resolve(entryPath)).href;
  }
}
if (import.meta.url === directEntryUrl) {
  process.exitCode = await runCli(process.argv.slice(2));
}
