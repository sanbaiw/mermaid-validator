# Publish the Stage 4 CLI as an npm preview package

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document is maintained in accordance with `PLANS.md`. It implements the user's explicit decision to distribute the already-complete Stage 4 CLI before Stage 5 begins. It references `DRAFT-PLAN.md`, `ARCHITECTURE.md`, `docs/adr/0001-validation-foundation.md`, and the new distribution decision recorded in `docs/adr/0002-preview-npm-distribution.md`, but it repeats the required boundaries here so a reader can execute this plan from this file alone.

## Purpose / Big Picture

After this work, a user can install `mermaid-validator@0.3.0` with npm or pnpm and run `mermaid-validator` without cloning this repository. The package is a CLI-only preview: it does not carry the repository's language server, publishes no supported JavaScript or TypeScript import, does not add declarations, and does not claim the stable Stage 6 API contract.

A pushed version tag such as `v0.3.0` starts `.github/workflows/publish.yml`. The workflow verifies that the tag and manifest version agree, runs the complete repository gate, builds one tarball, proves that the tarball installs and runs through both npm and pnpm, stores the tarball as a workflow artifact, and publishes that exact tarball to the public npm registry. Authentication uses npm trusted publishing through GitHub OpenID Connect, abbreviated OIDC, which means GitHub provides a short-lived identity token to npm rather than the repository storing a long-lived `NPM_TOKEN` secret.

## Progress

- [x] (2026-07-30 18:11Z) Read the repository instructions, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, `PLANS.md`, ADR 0001, current package metadata, CLI/LSP entry points, CI workflow, tests, and existing unrelated worktree changes.
- [x] (2026-07-30 18:11Z) Inspected the current unpackaged tarball and confirmed that it leaks source, tests, compatibility evidence, plans, and stale build output.
- [x] (2026-07-30 18:15Z) Inspected `/Users/wangzhihao/Documents/playground/web-source-bundler/.github/workflows/publish.yml` and its package metadata as the user-requested trusted-publisher reference.
- [x] (2026-07-30 18:15Z) Defined the CLI-only preview boundary and recorded the implementation goal in this living plan.
- [x] (2026-07-30 18:18Z) Added ADR 0002 and aligned the roadmap and architecture language with a public CLI-only preview that still denies all programmatic imports.
- [x] (2026-07-30 18:25Z) Made the npm manifest publishable, narrowed the package allowlist, added a clean-build lifecycle, and added release/package contract tests.
- [x] (2026-07-30 18:31Z) Added and debugged a repeatable real-tarball smoke program; the initial npm and pnpm proof exercised two installed bins.
- [x] (2026-07-30 18:32Z) Added the trusted-publisher workflow and release/bootstrap documentation without a token fallback.
- [x] (2026-07-30 18:39Z) Passed the initial two-bin packaging tests, full Node 22 and Node 24 gates, compatibility evidence, exact-artifact installed-package smoke checks, registry name lookup, and final read-only diff review; this artifact was later superseded.
- [x] (2026-07-31) Rebased `main` onto `origin/codex/stage-4-diagnostic-usability-hardening` before continuing package work, with the packaging work and unrelated user files restored without conflicts.
- [x] (2026-07-31) Narrowed the npm surface to the single `mermaid-validator` bin, excluded `dist/lsp/`, and moved LSP-only packages to exact-pinned development dependencies while preserving repository LSP build and test coverage.
- [x] (2026-07-31) Rebuilt the CLI-only tarball and passed focused contracts, npm/pnpm installed-consumer proof, Node 22 and Node 24 full gates, compatibility evidence, and package dry-run inspection on the rebased baseline.
- [x] (2026-07-31) Verified that the shorter unscoped npm name `mermaid-validator` returned E404, then adopted it as the single public package, CLI, JSON tool, LSP server, and GitHub repository name at the user's direction.
- [x] (2026-07-31) Revalidated the renamed package, renamed the GitHub repository to `sanbaiw/mermaid-validator`, updated the local `origin` URL, and created a dedicated rename commit without pushing the outgoing commits.

## Surprises & Discoveries

- Observation: The current `pnpm pack --dry-run --json` output contains almost the entire repository and stale compiled files that no longer have source counterparts.
  Evidence: The baseline includes `.github/`, `AGENTS.md`, all `src/`, all `tests/`, all fixtures and plans, `dist/compatibility/`, and stale `dist/adapters/`, `dist/spike/`, and `dist/tools/` files.

- Observation: `tsc` does not remove output for deleted or moved TypeScript files, so an allowlist alone cannot prevent stale JavaScript inside an allowed runtime subtree.
  Evidence: Before implementation, `dist/cli/json-v1-output.js` remained even though `src/cli/json-v1-output.ts` no longer exists. The build lifecycle must delete only the generated `dist/` directory before compiling.

- Observation: A package smoke test that reuses the user's global npm cache can fail before it examines the tarball and can inherit pnpm-specific `npm_config_*` values.
  Evidence: The first npm consumer install failed with `EPERM` under `~/.npm/_cacache/tmp` because of pre-existing ownership, while also warning about inherited pnpm configuration. The smoke program now removes inherited `npm_config_*` keys and places npm's cache under its own temporary root.

- Observation: The built CLI's direct-execution guard did not recognize npm or pnpm bin symlinks.
  Evidence: A clean npm tarball install succeeded, but `node_modules/.bin/mermaid-validator --version` exited 0 with empty stdout because `process.argv[1]` named the symlink while `import.meta.url` named its real target. Resolving the entry through `realpathSync()` before comparison makes installed shims call `runCli()` while preserving the direct built-entry path.

- Observation: pnpm preserves the explicit `--` separator when forwarding arguments to this package script.
  Evidence: The workflow-shaped command `pnpm package:smoke -- .release-artifacts/mermaid-validator-0.3.0.tgz` invokes Node as `package-smoke.mjs -- <tarball>`. The script accepts both that form and a direct single tarball argument, while rejecting extra arguments.

- Observation: The accepted roadmap deferred installed-package support and npm publication to Stage 6, even though the Stage 4 CLI is already useful for real-world feedback.
  Evidence: Before this checkpoint, `DRAFT-PLAN.md` said the package remained private through Stage 5 and made installed executable support a Stage 6 exit criterion; the baseline `package.json` set `private: true`.

- Observation: npm trusted publishing cannot bootstrap a package that does not yet exist in the registry.
  Evidence: npm's trusted-publisher prerequisites require write permission on an existing registry package. The workflow can be tokenless after the one-time first publication and trust binding, but it cannot create that trust relationship for a name that has never been published.

## Decision Log

- Decision: Insert an explicit “Stage 4 preview distribution” checkpoint instead of starting Stage 5 or claiming Stage 6 complete.
  Rationale: Distribution is requested now to gather real usage feedback, but Semantic Facts are not part of this task and stable programmatic APIs, SARIF/JUnit, MCP, security hardening, and migration policy remain future Stage 6 work.
  Date/Author: 2026-07-30 / Codex

- Decision: Initial package-name decision, superseded on 2026-07-31.
  Rationale: The longer working name was available, but the user chose the shorter `mermaid-validator` identity after comparing alternatives.
  Date/Author: 2026-07-30 / Codex

- Decision: Use `mermaid-validator` for every public identity: npm package, CLI binary, JSON `tool.name`, LSP `serverInfo.name`, and GitHub repository.
  Rationale: A single short name is easier to remember and avoids a package/repository/tool naming matrix. The local checkout directory keeps its existing filesystem path so the active Codex workspace is not invalidated.
  Date/Author: 2026-07-31 / User and Codex

- Decision: Initial two-bin distribution decision, superseded on 2026-07-31.
  Rationale: Both delivery adapters are complete at Stage 4, so the first package draft included both. The user subsequently narrowed the package to CLI only; the LSP remains checkout-only. The empty `exports` object continues to deny `import "mermaid-validator"` and deep subpath imports.
  Date/Author: 2026-07-30 / Codex

- Decision: Publish exactly one bin, `mermaid-validator`, and allow only `dist/cli/`, `dist/validation/`, and `README.md` in the tarball, in addition to metadata files npm always includes.
  Rationale: The requested real-world surface is currently the CLI. Its adapter needs the internal Diagram Validation implementation at runtime; `dist/lsp/`, Compatibility Evidence, TypeScript source, tests, fixtures, plans, workflows, and development tooling are not CLI runtime contents. LSP-only packages therefore remain exact-pinned development dependencies instead of npm-package runtime dependencies.
  Date/Author: 2026-07-31 / Codex

- Decision: Defer LSP publication without removing or weakening the repository LSP.
  Rationale: Package distribution scope and product source scope are separate. The current checkout continues to build and test `src/lsp/**`; publishing its executable requires a later explicit decision and installed-consumer contract.
  Date/Author: 2026-07-31 / Codex

- Decision: Make every normal build clean the generated `dist/` directory before invoking TypeScript.
  Rationale: Packaging only selected `dist/` subtrees still leaks stale files if deleted source outputs survive. `scripts/clean-dist.mjs` removes the one ignored generated directory by an exact resolved path, and `pnpm build` immediately recreates it.
  Date/Author: 2026-07-30 / Codex

- Decision: Isolate package-manager state during installed-package smoke checks.
  Rationale: Consumer proof should test the tarball rather than depend on user-global npm cache ownership or configuration leaked by the parent pnpm lifecycle. npm uses a smoke-owned temporary cache; both child managers receive a sanitized environment.
  Date/Author: 2026-07-30 / Codex

- Decision: Normalize only the CLI direct-execution entry through the filesystem real path.
  Rationale: npm and pnpm execute the CLI through generated symlinks. The runtime guard must compare the compiled module URL to the symlink target, while tests that import `runCli()` must still avoid executing the process entry automatically. LSP already executes unconditionally and needs no matching change.
  Date/Author: 2026-07-30 / Codex

- Decision: Follow the `web-source-bundler` trusted-publisher workflow pattern and do not add an `NPM_TOKEN` fallback.
  Rationale: The user explicitly requested trusted publishing. The workflow therefore grants `id-token: write`, installs an OIDC-capable npm CLI, uploads the exact tarball, and publishes it with provenance. A manual workflow dispatch stops after validation and artifact creation; only a pushed tag can publish.
  Date/Author: 2026-07-30 / Codex

- Decision: Do not invent an open-source license during packaging.
  Rationale: This repository has no license file or license field. Publishing bits and granting copyright permissions are different decisions; this task must not silently choose MIT or another license for the owner.
  Date/Author: 2026-07-30 / Codex

- Decision: During the initial packaging implementation, do not commit, tag, push, bootstrap the npm package, or alter npm/GitHub settings; this was later superseded only for the commit and repository rename when the user explicitly requested them.
  Rationale: The repository instructions prohibit commits unless asked. Publication, tagging, and trusted-publisher binding still require separate explicit execution after reviewing the final tarball.
  Date/Author: 2026-07-30 / Codex

## Outcomes & Retrospective

The initial two-bin artifact contained 72 entries, was 47,666 compressed bytes and 220,033 unpacked bytes, and passed npm/pnpm installation under Node 22.20.0 and Node 24.18.0. It is historical evidence only: the user narrowed publication to CLI only after the diagnostic-hardening rebase, so those artifact sizes, installed-LSP checks, and pre-rebase test counts are superseded.

The pre-rename CLI-only artifact was built under Node 24.18.0. It contained 64 entries and was 43,557 bytes compressed; npm's independent dry-run reported 193,454 unpacked bytes. Every entry was `package.json`, `README.md`, or compiled output under `dist/cli/` and `dist/validation/`; there was no LSP output, source, test, fixture, workflow, plan, or Compatibility Evidence. That artifact passed clean npm and pnpm consumer installs under Node 24.18.0, but it is superseded before publication.

The retained renamed artifact is `.release-artifacts/mermaid-validator-0.3.0.tgz`, built under Node 24.18.0. It contains the same 64-entry CLI-only graph and is 43,543 bytes compressed. The exact tarball passed clean npm and pnpm consumer installs; both installed `mermaid-validator` shims printed version `0.3.0` and validated a known-good `flowchart LR` document with status 0. The first sandboxed consumer proof reached its fixed 180-second npm network timeout; the unchanged command passed once registry access was allowed.

On the final renamed tree, Node 22.20.0 passed `pnpm check` with 32 passing files plus one opt-in skipped file and 285 passing tests plus one skipped test in 204.01 seconds. Node 24.18.0 passed the same counts in 204.46 seconds. Both full gates reported the unchanged Compatibility Evidence summary of 27 fixtures and 108 observations. The focused package, JSON reporter, and LSP contracts passed 4 files/42 tests before the full matrix. `git diff --check` and the final scope review passed after this evidence update.

The npm registry returned E404 for `mermaid-validator` on 2026-07-31, so the selected name appeared available at verification time but remains unreserved. GitHub repository ID `1299911016` was renamed in place from its working name to `sanbaiw/mermaid-validator`, and the local SSH `origin` now targets the renamed repository. No tag, push, npm publication, or trusted-publisher binding has been performed. The owner must review and push the workflow without a tag, manually bootstrap the first immutable package version, then configure npm trusted publishing for `sanbaiw/mermaid-validator` and `publish.yml`. If bootstrap publishes `0.3.0`, do not push `v0.3.0`; begin tag-driven trusted publication with a later version such as `0.3.1`.

## Context and Orientation

The repository is one TypeScript ECMAScript-module project. `src/cli/main.ts` is the source for the published `mermaid-validator` executable. `src/lsp/main.ts` remains the source for the checkout-only language server. Both call the repository-private Diagram Validation module through `src/validation/index.ts`; the compiled graph is written under `dist/` by `pnpm build`, but only CLI and Diagram Validation output enter the npm tarball. `src/compatibility/` and its compiled output are test evidence, not product runtime code.

The baseline `package.json` was private and had no package content allowlist. npm's tarball format always includes `package.json` and normally includes `README.md`; the manifest `files` array must narrow every other shipped path to the CLI runtime graph. The package has no `main` field and uses an empty `exports` object so consumers cannot treat internal compiled files as supported programmatic APIs.

`tests/architecture/no-visual-dependencies.test.ts` currently asserts that the package is private. That test must change to retain its real responsibilities—exact dependency pins and the absence of visual dependencies—while a new `tests/architecture/package-distribution.test.ts` owns the public-preview manifest, workflow, version synchronization, and package allowlist contracts.

`.github/workflows/ci.yml` already runs `pnpm check` on Node 22 and 24. The new `.github/workflows/publish.yml` is a release workflow, not a replacement for CI. It runs on pushed `v*` tags and on manual dispatch. Manual dispatch is verification-only; the actual publish step is conditioned on a tag push. The workflow uses GitHub-hosted Ubuntu, `actions/checkout@v5`, `pnpm/action-setup@v4`, `actions/setup-node@v5`, npm `^11.5.1`, `actions/upload-artifact@v6`, and `npm publish` with provenance, matching the user-selected reference repository's trusted-publisher shape.

The current worktree contains a user-owned `README.md` addition for `docs/performance/` and an untracked `docs/performance/` directory. This plan preserves that content. README packaging edits are appended around the existing text rather than removing the performance reference.

## Architecture and Scope Boundaries

Official Mermaid remains the only Canonical Syntax authority. CLI and LSP remain delivery adapters that depend inward on `src/validation/index.ts`; Diagram Validation never imports them. No source directory, module responsibility, dependency direction, dependency version, parser deadline, test timeout, retry, skip, renderer, geometry tool, image tool, or visual provider changes in this plan.

The public npm surface consists only of the `mermaid-validator` executable name. Repository `index.ts` files remain internal module seams. The package emits no declarations, has no `main` entry, and has an empty `exports` map. Raw Mermaid, mermaid-lint, Merman, JSDOM, LSP protocol, and internal Finding implementation values do not become public API contracts. LSP and Compatibility Evidence remain excluded from the tarball and continue to build and run from the checkout.

The new top-level `scripts/` directory contains release verification tooling only. It is not a product module and is excluded from the published tarball. No later-stage product directory is created.

## Plan of Work

First add `docs/adr/0002-preview-npm-distribution.md`. It records why CLI distribution is accelerated, why programmatic imports remain closed, what the tarball contains, how trusted publishing authenticates, and what remains deferred. Update `DRAFT-PLAN.md` and `ARCHITECTURE.md` so their top-level status and invariants distinguish a public executable package from a public programmatic API. Keep Stage 5 not started and Stage 6 incomplete.

Then update `package.json`. Set `private` to `false`; add repository, bugs, homepage, keywords, public publish configuration, an empty `exports` object, the single CLI `bin`, and a strict `files` allowlist for `dist/cli`, `dist/validation`, and `README.md`. Keep every package exact-pinned, moving the LSP-only packages to development dependencies so they remain available to checkout builds without entering a CLI consumer's dependency graph. Add `scripts/clean-dist.mjs` and make `pnpm build` remove only the ignored generated `dist/` directory before compiling, so old outputs cannot enter an allowed subtree. Add `prepack: pnpm build` so every pack or publish refreshes that clean output. Add `package:smoke` to invoke `node scripts/package-smoke.mjs`. Add `.release-artifacts/` and `*.tgz` to `.gitignore` so repeatable packaging does not dirty the checkout.

Add `tests/architecture/package-distribution.test.ts`. It must prove the manifest is publishable, contains the expected repository identity, exposes exactly the CLI bin, denies all imports, includes only the two runtime dist subtrees, keeps LSP packages out of published runtime dependencies, uses a build-only prepack hook, and does not contain a token-based publication path. It must also compare the package version to the CLI version constant so a release bump cannot publish a tarball whose `--version` output is stale. Update `tests/architecture/no-visual-dependencies.test.ts` only to remove the obsolete `private: true` assertion.

Add `scripts/package-smoke.mjs`. With no argument, it creates a temporary directory, builds an actual tarball, validates the tar archive against the CLI-only allowlist, installs the tarball into separate temporary npm and pnpm consumer projects, and runs the installed `mermaid-validator --version` plus a valid Mermaid file. With a tarball path argument, it skips packing and verifies that exact release artifact. It deletes only its own unique temporary directories in a `finally` block and reports a concise success line. If the installed CLI proof exposes a bin-shim-only defect, fix the entry in `src/cli/main.ts` without changing CLI behavior or the Diagram Validation seam.

Add `.github/workflows/publish.yml` using the trusted-publisher pattern described above. It verifies pushed tags against `package.json`, installs from the frozen lockfile, runs `pnpm check`, creates one tarball under `.release-artifacts/`, runs the package smoke program against that tarball, uploads it, and publishes only for a tag push. It contains `id-token: write` and no `NODE_AUTH_TOKEN`, `NPM_TOKEN`, or npm secret reference.

Update `README.md` with npm and pnpm installation commands, installed CLI examples, the `0.x` preview and no-programmatic-import boundary, and a link to a new `docs/reference/releasing.md`. The release reference explains the version/tag invariant, exact trusted-publisher identity (`sanbaiw/mermaid-validator` and `publish.yml`), the one-time first-publication prerequisite, registry verification, and installed-package verification. It must be explicit that a tag is not pushed until the package exists and the trusted publisher has been configured, unless the owner intentionally performs the documented one-time manual bootstrap.

Finally run focused tests, package dry-run inspection, real npm and pnpm installed-package smoke, the complete `pnpm check` and `pnpm compatibility` gates on Node 22.20.0 and Node 24.18.0, `git diff --check`, and a final read-only review of all changed files against this plan. Record actual evidence in this plan and do not publish or commit.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. The repository-level instruction requires the `rtk` prefix for every shell command.

After implementation, run the focused package contract and build:

    rtk pnpm exec vitest run tests/architecture/package-distribution.test.ts tests/architecture/no-visual-dependencies.test.ts
    rtk pnpm build
    rtk pnpm pack --dry-run --json

The dry-run file list must contain only `package.json`, `README.md`, and paths under `dist/cli/` and `dist/validation/`. npm may add standard metadata such as a generated license only if one exists in the repository; this repository currently has none.

Run the installed-package proof:

    rtk pnpm package:smoke

It must end with a line equivalent to:

    Package smoke passed for npm and pnpm: mermaid-validator@0.3.0

Run the full gates under both established runtimes:

    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:$PATH pnpm install --frozen-lockfile
    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:$PATH pnpm check
    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:$PATH pnpm compatibility
    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:$PATH pnpm install --frozen-lockfile
    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:$PATH pnpm check
    rtk env PATH=/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:$PATH pnpm compatibility
    rtk git diff --check
    rtk git status --short

Record the actual post-rebase test counts rather than assuming the superseded pre-rebase counts. The compatibility gate remains 4 files and 16 passing tests over 27 fixtures and 108 observations unless current evidence shows otherwise.

## Validation and Acceptance

Acceptance requires all of the following observable behavior.

`pnpm pack --dry-run --json` shows no `dist/lsp/`, `src/`, `tests/`, `fixtures/`, `.github/`, plans, compatibility evidence, or stale output. A real tarball can be installed by both npm and pnpm in clean temporary consumer projects. In each project, the generated CLI shim prints `0.3.0` and validates a known-good `flowchart LR` input with exit code 0.

The manifest has no supported import entry. `exports` is exactly an empty object, there is no `main`, and no declaration files are shipped. The single `bin` path points to a file included in the tarball and preserves its Node shebang. LSP-only packages are not published runtime dependencies.

The publish workflow has a tag/version guard, frozen installation, full quality gate, exact tarball reuse, artifact upload, OIDC permission, and provenance publication. It has no token secret. A manual dispatch completes validation and uploads the artifact but skips `npm publish`; a pushed matching tag reaches the publish step after every prior step passes.

Roadmap and architecture text consistently say that Stage 4 executable distribution is public preview while programmatic interfaces remain private through Stage 5. Stage 5 remains not started. Stage 6 still owns stable imports, declarations, compatibility/migration policy, SARIF/JUnit, MCP, and production hardening.

## Idempotence and Recovery

Manifest, test, workflow, ADR, and documentation edits are ordinary patch-based files and may be reapplied safely. `pnpm build` replaces ignored `dist/` output. The package smoke program writes only beneath unique operating-system temporary directories unless given an existing tarball, and it removes only directories it created. `.release-artifacts/` and tarballs are ignored; the workflow starts from a clean checkout and creates one artifact.

If an npm or pnpm consumer installation fails because registry access is unavailable, retain the successful tarball-content checks, rerun with network access, and do not claim installed-package acceptance until both managers pass. If the package name becomes occupied, stop before publication and choose a new name explicitly; do not silently switch to a scope. If a version already exists, bump the manifest and published CLI version constant together, rerun the entire validation set, and create a matching new tag because npm versions are immutable.

The first publication is special. A trusted publisher cannot be attached until the package exists. The owner must first review and manually publish one verified tarball using an authenticated npm session with two-factor authentication, then configure the package's trusted publisher for GitHub repository `sanbaiw/mermaid-validator`, workflow filename `publish.yml`, and publish permission. Only subsequent matching tags use the tokenless workflow. Do not add a temporary repository token fallback.

## Artifacts and Notes

Baseline package evidence before the allowlist:

    name: mermaid-validator
    version: 0.3.0
    package content: repository sources, tests, fixtures, plans, compatibility evidence,
                     workflows, and stale dist output in addition to runtime files

The user-selected trusted-publisher reference uses these load-bearing steps:

    permissions:
      contents: read
      id-token: write

    npm install -g npm@^11.5.1
    npm publish "${PACKAGE_FILE}" --provenance --access public

This implementation retains those semantics while changing Bun-specific installation and packing to pnpm and making manual dispatch verification-only.

## Interfaces and Dependencies

There are no new packages and every existing direct package remains exact-pinned. The two LSP-only packages move from runtime dependencies to development dependencies because the published graph does not contain LSP code; checkout builds and tests still install them. `scripts/package-smoke.mjs` uses only Node built-ins: `node:assert/strict`, `node:child_process`, `node:fs/promises`, `node:os`, `node:path`, and `node:url` if needed.

The final `package.json` executable interface is:

    "bin": {
      "mermaid-validator": "./dist/cli/main.js"
    }

The final package import boundary is:

    "exports": {}

The final content boundary is:

    "files": [
      "dist/cli",
      "dist/validation",
      "README.md"
    ]

No programmatic types cross a new seam. No `src/**` file changes responsibility. The release workflow communicates with npm only through `npm publish` in a GitHub-hosted OIDC environment.

2026-07-30 / Codex: Created this ExecPlan after inspecting the complete Stage 4 repository state, the oversized baseline tarball, current npm trusted-publishing requirements, and the user-selected `web-source-bundler` reference. The plan makes preview distribution explicit without activating Stage 5 or promising Stage 6 programmatic stability.

2026-07-30 / Codex: Completed the repository implementation and validation. Updated the living plan with clean-build, isolated-cache, bin-symlink, pnpm argument-forwarding, dual-runtime, exact-artifact, registry-availability, and bootstrap-version evidence so a future release operator can resume from this file alone.

2026-07-31 / Codex: Rebased onto the diagnostic-usability-hardening branch as requested, then revised the distribution boundary to the user's final CLI-only scope. The earlier two-bin artifact evidence is explicitly superseded; repository LSP behavior remains in source and tests but is excluded from the npm tarball and published runtime dependencies. The final CLI-only artifact passed exact npm/pnpm installed-consumer proof and serial Node 22/24 full gates.
