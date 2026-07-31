#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const temporaryRoot = await mkdtemp(join(tmpdir(), "mermaid-validator-package-"));
const commandTimeoutMs = 180_000;

function run(command, arguments_, options = {}) {
  const inheritedEnvironment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.toLowerCase().startsWith("npm_config_")),
  );
  const result = spawnSync(command, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: { ...inheritedEnvironment, CI: "1", NO_COLOR: "1", ...options.env },
    timeout: options.timeout ?? commandTimeoutMs,
  });
  const expectedStatus = options.expectedStatus ?? 0;
  assert.equal(
    result.status,
    expectedStatus,
    [
      `${command} ${arguments_.join(" ")} exited with ${String(result.status)}`,
      result.error?.message,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"),
  );
  return result;
}

async function createTarball() {
  const destination = join(temporaryRoot, "pack");
  await mkdir(destination);
  run("pnpm", ["pack", "--pack-destination", destination]);
  return join(destination, `${manifest.name}-${manifest.version}.tgz`);
}

async function assertTarballContents(tarball) {
  await stat(tarball);
  const entries = run("tar", ["-tzf", tarball]).stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//u, ""));
  const allowedRoots = ["dist/cli/", "dist/validation/"];
  const allowedExact = new Set(["package.json", "README.md"]);
  for (const entry of entries) {
    assert.ok(
      allowedExact.has(entry) || allowedRoots.some((root) => entry.startsWith(root)),
      `Unexpected package entry: ${entry}`,
    );
  }
  for (const required of [
    "package.json",
    "README.md",
    "dist/cli/main.js",
    "dist/validation/index.js",
    "dist/validation/canonical-syntax/worker-entry.js",
  ]) {
    assert.ok(entries.includes(required), `Missing package entry: ${required}`);
  }
}

async function verifyConsumer(packageManager, tarball) {
  const consumer = join(temporaryRoot, `${packageManager}-consumer`);
  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify({ name: `${packageManager}-consumer`, private: true }, null, 2)}\n`,
  );

  if (packageManager === "npm") {
    run("npm", [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--package-lock=false",
      tarball,
    ], {
      cwd: consumer,
      env: { npm_config_cache: join(temporaryRoot, "npm-cache") },
    });
  } else {
    run("pnpm", ["add", "--ignore-scripts", `file:${tarball}`], { cwd: consumer });
  }

  const installedManifest = JSON.parse(await readFile(
    join(consumer, "node_modules", manifest.name, "package.json"),
    "utf8",
  ));
  assert.equal(installedManifest.private, false);
  assert.deepEqual(installedManifest.exports, {});
  assert.deepEqual(installedManifest.bin, manifest.bin);

  const binDirectory = join(consumer, "node_modules", ".bin");
  const validator = join(binDirectory, "mermaid-validator");
  const version = run(validator, ["--version"], { cwd: consumer });
  assert.equal(version.stdout, `${manifest.version}\n`);
  assert.equal(version.stderr, "");

  const diagram = join(consumer, "valid.mmd");
  await writeFile(diagram, "flowchart LR\n  A --> B\n");
  const validation = run(validator, [diagram], { cwd: consumer });
  assert.equal(validation.stdout, "");
  assert.equal(validation.stderr, "");
}

try {
  const scriptArguments = process.argv.slice(2);
  if (scriptArguments[0] === "--") scriptArguments.shift();
  assert.ok(scriptArguments.length <= 1, "Usage: package-smoke.mjs [tarball.tgz]");
  const tarballArgument = scriptArguments[0];
  const tarball = tarballArgument === undefined
    ? await createTarball()
    : resolve(repositoryRoot, tarballArgument);
  assert.equal(basename(tarball), `${manifest.name}-${manifest.version}.tgz`);
  await assertTarballContents(tarball);
  await verifyConsumer("npm", tarball);
  await verifyConsumer("pnpm", tarball);
  process.stdout.write(
    `Package smoke passed for npm and pnpm: ${manifest.name}@${manifest.version}\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
