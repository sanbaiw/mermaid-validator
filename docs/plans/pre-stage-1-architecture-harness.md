# Bootstrap the Bun architecture harness before Stage 1

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at the repository root. It is intentionally a pre-Stage-1 bootstrap: it changes repository tooling, archives and removes Stage 0 implementation evidence from the active branch, and installs executable architecture enforcement. It does not implement the Stage 1 validation core or CLI.

## Purpose / Big Picture

After this plan is complete, a worker agent can start Stage 1 in a small Bun-native repository and get immediate, prescriptive feedback when an import, dependency, source path, or stage boundary violates the accepted architecture. Running `bun run architecture` will inspect the real repository and either print one deterministic success line or list every violation with a stable rule identifier, source location, violated invariant, and concrete repair. Running `bun run check` will typecheck the harness, run its focused tests, check repository hygiene and package policy, and prove the package can be packed by Bun without writing a release artifact.

The completed Stage 0 spike will remain recoverable from the remote branch `codex/archive-stage-0-spike` at commit `0243adb52ef124d3015afd0d272f4a7995a17d23`. The active branch will no longer contain `src/spike`, `src/adapters`, the compatibility corpus, or the Stage 0 test harness. ADR 0001 remains in the active branch as the historical record of what was proved on Node 22 and 24. A new ADR records why Bun supersedes the product-toolchain portion of that decision without pretending the earlier evidence was produced on Bun.

The final repository still says that Stage 1 is not started. No `src/validation`, `src/cli`, LSP, MCP, extraction, rule, fact, rendering, geometry, layout-comparison, image, or vision product module is created by this plan.

## Progress

- [x] (2026-07-14 12:41Z) Created and pushed `codex/archive-stage-0-spike` at `0243adb52ef124d3015afd0d272f4a7995a17d23` before changing the active branch.
- [x] (2026-07-14 12:51Z) Verified that the remote archive reference resolves to the recorded commit and documented both checkout and worktree recovery.
- [ ] Prove the pinned Mermaid and JSDOM Stage 0 profile under Bun 1.3.14 before deleting the live compatibility harness.
- [ ] Record the Bun toolchain and distribution decision in ADR 0002 and update all active toolchain instructions consistently.
- [ ] Replace pnpm, Node runtime scripts, Vitest, NodeNext configuration, and the Node CI matrix with the exact-pinned Bun toolchain.
- [ ] Remove Stage 0 implementation evidence from the active branch after the archive and Bun proof gates pass.
- [ ] Implement and test the TypeScript-aware executable architecture policy.
- [ ] Wire `bun run architecture` and all existing non-visual and hygiene invariants into `bun run check`.
- [ ] Shorten `ARCHITECTURE.md` only after the executable policy is green, retaining rationale while removing mechanically duplicated rule tables and checker instructions.
- [ ] Run the full local and hosted validation gates and confirm that Stage 1 remains unstarted.

## Surprises & Discoveries

- Observation: The current repository is a clean two-commit history whose `main` and `origin/main` both point at the completed Stage 0 commit `0243adb`.
  Evidence: `git status -sb`, `git log --oneline --decorate -8`, and the successful remote creation of `codex/archive-stage-0-spike` on 2026-07-14.

- Observation: The accepted documents and automation currently encode Node and pnpm in multiple independent places, so a partial Bun edit would leave agents with contradictory instructions.
  Evidence: `AGENTS.md` requires pnpm; `DRAFT-PLAN.md` decision D008 selects Node 24 and pnpm; `package.json`, `.nvmrc`, `pnpm-lock.yaml`, `.github/workflows/ci.yml`, `ARCHITECTURE.md`, `README.md`, and the completed Stage 0 ExecPlan contain Node- or pnpm-specific behavior.

- Observation: ADR 0001 proves the Mermaid 11.16.0 and JSDOM 26.1.0 profile on Node 22.20.0 and Node 24.18.0 only. That result cannot be relabeled as Bun evidence.
  Evidence: `docs/adr/0001-validation-foundation.md` names the verified runtimes and records no Bun run.

- Observation: Bun 1.3.14 can migrate `pnpm-lock.yaml` to the text `bun.lock`, can pack npm-compatible tarballs with `bun pm pack`, and can create standalone executables with `bun build --compile`; standalone worker entrypoints require explicit packaging treatment.
  Evidence: the Bun lockfile, package-manager, and executable documentation linked in `Artifacts and Notes`.

- Observation: The installed Bun runtime and the current `@types/bun` registry release are both 1.3.14.
  Evidence: `bun --version` returned `1.3.14`, `bun --revision` returned `1.3.14+0d9b296af`, and `bun pm view @types/bun version` returned `1.3.14` on 2026-07-14.

- Observation: OpenAI's Harness Engineering report treats a short agent instruction file as a map, repository-local documentation as the system of record, and custom linters plus structural tests as the mechanism for enforcing strict dependency directions. It also recommends writing lint diagnostics as remediation instructions that become useful agent context.
  Evidence: the `Repository knowledge`, `Enforcing architecture and taste`, and `Agent legibility` sections of the OpenAI article linked in `Artifacts and Notes`.

## Decision Log

- Decision: Preserve Stage 0 on the remote branch `codex/archive-stage-0-spike` and by exact commit, then remove its implementation code and executable fixtures from the active branch rather than migrating them into `src/compatibility`.
  Rationale: The user wants the spike not to influence later agents. A branch and commit provide faithful recovery without teaching the new architecture checker a permanent legacy zone or allowing Stage 1 product types to grow out of `EngineObservation` and other experimental contracts.
  Date/Author: 2026-07-14 / user and Codex.

- Decision: Keep `docs/adr/0001-validation-foundation.md` in the active branch, but archive the completed Stage 0 ExecPlan with the spike implementation and add a concise archive-provenance note to `DRAFT-PLAN.md` and `README.md`.
  Rationale: ADR 0001 is an accepted historical decision record. The completed plan contains hundreds of lines of now-obsolete pnpm and Node commands that would be an attractive nuisance once Bun becomes authoritative. The archive branch retains the complete original plan.
  Date/Author: 2026-07-14 / Codex.

- Decision: Pin Bun and its TypeScript declarations to 1.3.14, use Bun as the package manager, script runtime, and test runner, and keep TypeScript 7.0.2 as the parser and typechecker used by the architecture harness.
  Rationale: This implements the user’s runtime and packing decision while retaining the already exact-pinned compiler needed for TypeScript-aware dependency resolution. A single exact Bun version makes local, CI, packing, and later executable behavior reproducible.
  Date/Author: 2026-07-14 / user and Codex.

- Decision: Use `module: "Preserve"` and `moduleResolution: "Bundler"`, with Bun types explicitly selected, after the Stage 0 source has been archived.
  Rationale: The active repository will execute TypeScript directly in Bun and later bundle it with Bun instead of emitting NodeNext JavaScript with TypeScript. The checker must read the parsed tsconfig options rather than hardcode either resolution algorithm.
  Date/Author: 2026-07-14 / Codex.

- Decision: Implement the architecture checker locally under `tools/architecture/` with the exact-pinned TypeScript Compiler API and test it with `bun:test`; do not add dependency-cruiser or an ESLint stack.
  Rationale: The repository needs custom zone classification, public-seam enforcement, package ownership, stage ceilings, cycles, and remediation messages. The local checker can follow the repository’s actual Bun/TypeScript resolver and adds no upstream architecture dependency. Repository tooling belongs under `tools/`; product TypeScript remains under `src/`.
  Date/Author: 2026-07-14 / Codex.

- Decision: Keep OS-process isolation as the Stage 1 canonical parser boundary. During ordinary Bun execution the host will launch Bun through `process.execPath`; a future compiled executable will use a hidden self-exec worker mode rather than assuming an adjacent worker file exists.
  Rationale: A Web Worker isolates a thread, not the process. The product requires bounded crash and global-state isolation. The self-exec design also gives Bun’s standalone packer one entrypoint and avoids relying on unresolved worker-file paths. This plan records and enforces the boundary but does not implement it before Stage 1.
  Date/Author: 2026-07-14 / Codex.

- Decision: Treat the npm tarball and native standalone executables as separate Stage 1 artifacts. Use `bun pm pack` for the Bun-targeted npm package and `bun build --compile` for native release assets; do not place every platform binary into the ordinary npm tarball.
  Rationale: The package and native binaries have different dependency, size, platform, signing, and test contracts. The pre-Stage-1 repository can prove `bun pm pack --dry-run`; real CLI packing and clean-install execution begin only after Stage 1 creates the CLI entrypoint.
  Date/Author: 2026-07-14 / Codex.

- Decision: Remove detailed import matrices, external-owner tables, negative-fixture instructions, and tool-selection prose from `ARCHITECTURE.md` only after equivalent executable rules and focused tests pass.
  Rationale: Before enforcement those sections are the specification. After enforcement, duplicating the exact mechanics in prose creates drift. The architecture document must retain intent, domain language, module responsibilities, data flow, and stage-growth rationale, then point to the executable policy for the exact rules and repairs.
  Date/Author: 2026-07-14 / user and Codex.

## Outcomes & Retrospective

The implementation has not started. The archive branch is established, pushed, and remotely verified at the recorded commit. Complete this section after each major milestone with the Bun compatibility result, the paths removed from the active branch, the checker rule count and fixture count, the final architecture-document reduction, and any remaining work before Stage 1.

## Context and Orientation

The repository currently contains no product validator or CLI. Its TypeScript source is the completed Stage 0 compatibility spike under `src/spike/` and `src/adapters/`. That code compares official Mermaid, mermaid-lint, and Merman over a 27-fixture corpus and records 108 normalized observations. `docs/adr/0001-validation-foundation.md` is the accepted summary of those results. The current package, scripts, CI, and TypeScript configuration are Node 22/24 and pnpm based.

`DRAFT-PLAN.md` controls product scope and delivery stages. It says Stage 0 is complete and Stage 1 is not started. `ARCHITECTURE.md` controls module responsibilities and dependency direction. `PLANS.md` controls the form and maintenance of this ExecPlan. `AGENTS.md` is the short operational entry point seen by later agents. This plan must update those surfaces together when Bun becomes authoritative, while leaving the Stage 1 status unchanged.

The remote archive branch is a recovery boundary, not an ongoing development branch. A fresh clone has the name `origin/codex/archive-stage-0-spike`, not necessarily a local branch with the shorter name. Fetch that remote-tracking reference explicitly, then inspect the exact original repository in another working directory with a detached worktree:

    rtk git fetch origin codex/archive-stage-0-spike:refs/remotes/origin/codex/archive-stage-0-spike
    rtk git worktree add --detach ../mermaid-diagram-validator-stage0 origin/codex/archive-stage-0-spike

To inspect it in the current checkout instead, first ensure the worktree is clean and enter detached-HEAD mode so an accidental commit cannot advance the archive branch:

    rtk git switch --detach origin/codex/archive-stage-0-spike

Return to the implementation branch with `rtk git switch <implementation-branch>`. Never commit Stage 1 work to the archive branch and never force-push it.

An architecture harness is repository tooling that parses code and metadata, builds a dependency graph, compares it with a checked-in policy, and exits nonzero on violations. A module zone is a named group of files with the same ownership and allowed dependency directions, such as the future CLI adapter or the future Canonical Syntax implementation. The executable policy is authoritative for exact edge and dependency rules after this plan’s documentation-trimming milestone. The prose architecture remains authoritative for why those zones and boundaries exist.

The bootstrap policy has an explicit `pre-stage-1` stage. In that state, all product source under `src/` is forbidden because the spike has been archived and Stage 1 has not started. The policy already describes the accepted Stage 1 zones, but they become active only when the Stage 1 ExecPlan updates the stage value and the corresponding product status in `DRAFT-PLAN.md`. This makes stage activation one deliberate, reviewable change instead of an empty-directory convention.

## Plan of Work

### Milestone 1: Verify the archive and prove Bun against the canonical corpus

Begin by proving the remote archive ref points to `0243adb52ef124d3015afd0d272f4a7995a17d23`. Do not delete or move a Stage 0 file until this comparison succeeds. Record the remote output in this plan’s `Artifacts and Notes` section.

Use installed Bun 1.3.14 for the proof. Before changing the package manifest, let Bun migrate the existing pnpm resolution into a temporary `bun.lock` and inspect that the direct Mermaid, mermaid-lint, Merman, JSDOM, TypeScript, and Vitest versions remain the exact versions recorded in ADR 0001. Keep `pnpm-lock.yaml` during this proof. A lockfile conversion is not itself proof that the runtime works.

Add a narrow temporary `bun:test` proof that imports the existing fixture manifest and direct-official Stage 0 adapter, executes all 27 fixtures under Bun, and asserts the 12 accepted and 15 rejected canonical verdicts with zero engine failures. The current `runEngineIsolated()` default points to built output at `dist/spike/worker.js`, which does not exist in a clean checkout. The temporary test must therefore call it with `workerPath` set to the absolute repository path `src/spike/worker.ts`. This deliberately proves that Bun can spawn the TypeScript worker source through `process.execPath`; do not build with Node or TypeScript as an accidental prerequisite. Exercise the existing failure-fixture paths under `tests/fixtures/workers/` for timeout, malformed output, nonzero exit, initialization failure, kill, and subsequent-success behavior. Do not update the Stage 0 compatibility snapshot to make a disagreement disappear. If TypeScript worker execution, direct-official verdicts, structured failure distinction, or isolation behavior differ, stop this plan before deleting evidence, document the discrepancy in `Surprises & Discoveries`, and decide whether Bun can be the product runtime.

Record the successful Bun proof in the new ADR 0002 with the exact Bun revision, direct dependency versions, fixture counts, and process-isolation cases. The temporary proof may be removed with the rest of Stage 0 after its result is recorded because the archive branch and exact commands preserve the original inputs.

This milestone is complete when the remote archive is verified and Bun 1.3.14 reproduces the canonical Stage 0 verdicts and bounded process behavior without changing the original evidence.

### Milestone 2: Make Bun the sole active repository toolchain

Create `docs/adr/0002-bun-toolchain-and-architecture-harness.md`. State that it supersedes only the future product-toolchain portion of D008 and ADR 0001; it does not rewrite the Node-based Stage 0 measurements. Record Bun 1.3.14, `@types/bun` 1.3.14, TypeScript 7.0.2, Bun’s isolated linker, Bundler module resolution, the separate npm/native artifact decision, and the OS-process worker boundary.

Change `package.json` to exact-pin `packageManager` as `bun@1.3.14` and `engines.bun` as `1.3.14`. Keep the package private before Stage 1. The final bootstrap manifest has no product dependencies and has only exact-pinned `typescript@7.0.2` and `@types/bun@1.3.14` as development dependencies unless implementation evidence proves another harness-only dependency indispensable. Use `bun:test`; remove Vitest after all surviving tests have been migrated. Prescribe these scripts exactly so focused feedback is available without making the full check repeat the architecture test suite:

    "scripts": {
      "typecheck": "tsc -p tsconfig.json --noEmit",
      "test": "bun test",
      "architecture:test": "bun test tests/architecture",
      "architecture:check": "bun run tools/architecture/check.ts",
      "architecture": "bun run architecture:test && bun run architecture:check",
      "hygiene": "bun run tools/architecture/repository-hygiene.ts",
      "pack:check": "bun pm pack --dry-run",
      "check": "bun run typecheck && bun test && bun run architecture:check && bun run hygiene && bun run pack:check"
    }

Create `.bun-version` containing `1.3.14`. Create `bunfig.toml` with exactly this package-manager configuration:

    [install]
    linker = "isolated"

Replace the three TypeScript configs with one `tsconfig.json` containing the following configuration. New relative imports use explicit `.ts` extensions consistently because Bun executes the source and the compiler does not emit JavaScript. Remove `tsconfig.build.json` and `tsconfig.test.json` after their remaining tests have moved.

    {
      "compilerOptions": {
        "target": "ESNext",
        "module": "Preserve",
        "moduleResolution": "Bundler",
        "moduleDetection": "force",
        "lib": ["ESNext", "DOM"],
        "strict": true,
        "exactOptionalPropertyTypes": true,
        "noUncheckedIndexedAccess": true,
        "noImplicitOverride": true,
        "useUnknownInCatchVariables": true,
        "verbatimModuleSyntax": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "types": ["bun"],
        "noEmit": true,
        "allowImportingTsExtensions": true,
        "newLine": "lf"
      },
      "include": ["src/**/*.ts", "tools/**/*.ts", "tests/**/*.ts"],
      "exclude": ["tests/architecture/fixtures/**"]
    }

Generate the text `bun.lock` through Bun’s pnpm-lock migration, inspect it, and run a frozen install. Remove `pnpm-lock.yaml` and `.nvmrc` only after the Bun proof and frozen install pass. Update `.github/workflows/ci.yml` to install exactly Bun 1.3.14 and run `bun install --frozen-lockfile` followed by `bun run check`. Do not retain a Node matrix that implies Node is a supported product runtime.

Update `AGENTS.md`, the header and D008/technology rows in `DRAFT-PLAN.md`, and the active commands in `README.md`. Also make a minimal consistency edit to `ARCHITECTURE.md` now: replace its NodeNext parsing requirement with resolution through the live Bun/Bundler TypeScript configuration, replace `pnpm check` with `bun run check`, and describe the accepted Bun subprocess boundary. Do not trim its rule tables or fixture instructions yet; that reduction remains gated on Milestone 6. Every live instruction must say Bun; pnpm and Node commands may remain only in ADR 0001 or on the archive branch. Update Stage 1’s plan to require the Bun canonical-parser proof, Bun subprocess isolation, a Bun-targeted npm tarball, and a separately tested native executable. Do not implement those Stage 1 product artifacts here.

This milestone is complete when a clean `bun install --frozen-lockfile`, `bun run typecheck`, and the surviving Bun tests pass with no pnpm lockfile, `.nvmrc`, Node engine promise, Vitest dependency, or live pnpm command.

### Milestone 3: Remove Stage 0 implementation evidence from the active branch

After Milestones 1 and 2 are green, remove `src/spike/`, `src/adapters/`, `fixtures/compatibility/`, `tests/compatibility/`, `tests/fixtures/workers/`, `tests/architecture/engine-versions.test.ts`, `vitest.config.ts`, and `docs/plans/stage-0-compatibility-and-reuse-spike.md` from the active branch. Remove their package scripts and dependencies. Do not remove ADR 0001.

Before deleting `src/spike/hygiene.ts`, move its repository-file and trailing-whitespace checks into Bun-native repository tooling under `tools/architecture/repository-hygiene.ts`, retain its temporary-repository test under `tests/architecture/`, and add a real-repository test that expects no hygiene problems. Preserve the existing exact-pin, forbidden visual dependency, no optional dependency, generated-source, and active-stage directory checks; they become policy rules in the next milestone instead of disappearing with Stage 0.

Add concise provenance to `DRAFT-PLAN.md` and `README.md`: Stage 0’s complete source, corpus, snapshots, and completed ExecPlan are stored on `codex/archive-stage-0-spike` at the exact recorded commit, while ADR 0001 remains the active historical summary. Remove active-tree links to deleted files or rewrite them as archive references.

This milestone is complete when `rg` finds no live imports or scripts referring to `src/spike`, `src/adapters`, compatibility fixtures, Vitest, pnpm, or the deleted Stage 0 plan outside historical ADR text and explicit archive provenance.

### Milestone 4: Implement the executable architecture policy

Create these repository-tooling files:

    tools/architecture/check.ts
    tools/architecture/import-graph.ts
    tools/architecture/policy.ts
    tools/architecture/diagnostics.ts
    tools/architecture/repository-hygiene.ts
    tests/architecture/import-boundaries.test.ts
    tests/architecture/package-policy.test.ts
    tests/architecture/repository-hygiene.test.ts
    tests/architecture/fixtures/

`tools/architecture/import-graph.ts` reads and parses `tsconfig.json` with the installed TypeScript Compiler API. It discovers relevant TypeScript source from the parsed configuration, not from a duplicated hardcoded glob. It collects static imports, re-exports, type-only imports, import-type nodes, literal dynamic imports, TypeScript import-equals forms, literal `require` and `require.resolve` calls, and statically named Bun or Web Worker entry references. It resolves project specifiers with the compiler options actually read from `tsconfig.json`. Type-only dependencies count as architecture edges because they still create coupling.

Classify every checked file into exactly one of the following zones. Classification uses normalized repository-relative POSIX paths and the first matching entry in this list; `tests/architecture/fixtures/**` is excluded from the live graph and is scanned only by focused fixture tests.

    architecture-tool       tools/architecture/**
    architecture-test       tests/architecture/** except tests/architecture/fixtures/**
    validation-public       exactly src/validation/index.ts
    validation-root         direct .ts children of src/validation/ except index.ts
    canonical-public        exactly src/validation/canonical-syntax/index.ts
    canonical-internal      other .ts descendants of src/validation/canonical-syntax/**
    cli                     src/cli/**
    contract-test           tests/contract/validation/**
    cli-integration-test    tests/integration/cli/**
    internal-test           tests/internal/**
    lsp                     src/lsp/**
    mcp                     src/mcp/**
    archived-compatibility  src/compatibility/**

Unknown production, tooling, and test paths fail closed. `pre-stage-1` enables only `architecture-tool` and `architecture-test`; every `src/**` file is an `ARCH004` stage violation. Stage 1 additionally enables `validation-public`, `validation-root`, `canonical-public`, `canonical-internal`, `cli`, `contract-test`, `cli-integration-test`, and path-scoped `internal-test` entries. `lsp` has minimum stage 4, `mcp` has minimum stage 6, and `archived-compatibility` is never active because its evidence lives on the archive branch. Define `inactivePaths` exactly as `src/validation/extraction/**` at stage 2, `src/validation/rules/**` at stage 3, `src/validation/semantic-facts/**` at stage 5, and `src/render/**`, `src/rendering/**`, `src/geometry/**`, `src/layout/**`, `src/image/**`, and `src/vision/**` as `"deferred"`. Creating one early is a stage violation even if it contains no imports; the later activating plan must add its zone and edges deliberately.

Encode the allowed project-edge matrix below literally in `tools/architecture/policy.ts`. A zone may import itself only when its own name appears in its target list. Any other project edge fails.

    architecture-tool     -> architecture-tool
    architecture-test     -> architecture-test, architecture-tool
    validation-public     -> validation-root
    validation-root       -> validation-root, canonical-public
    canonical-public      -> canonical-internal
    canonical-internal    -> canonical-internal
    cli                   -> cli, validation-public
    contract-test         -> contract-test, validation-public
    cli-integration-test  -> cli-integration-test
    internal-test         -> internal-test, plus only exact target paths listed in internalTestTargets
    lsp                   -> lsp, validation-public
    mcp                   -> mcp, validation-public
    archived-compatibility -> archived-compatibility, validation-public

The `internalTestTargets` map is empty in this bootstrap. A later implementation may add an entry only as an exact test-file to exact production-file mapping with a rationale; directory wildcards are forbidden. The public-seam rule is more specific than the matrix: any import from outside `src/validation/**` to a validation target other than `src/validation/index.ts`, and any validation-root import that bypasses `src/validation/canonical-syntax/index.ts`, reports `ARCH003`. Product zones can never import tools, tests, LSP, MCP, or archived compatibility. Delivery zones can never import each other. Test policies are explicit rather than globally exempt.

Run strongly connected components over all resolved project edges, including type-only edges. For each cyclic component, emit one `ARCH006` diagnostic containing its lexicographically sorted member paths. Do not promise a single cycle route containing every member because a strongly connected component need not have such a simple route.

Encode package and builtin ownership in the same policy. In the bootstrap, `typescript` is a development package owned only by `architecture-tool`; `@types/bun` is a declaration-only development package and must never appear as a runtime import. `bun:test` is a Bun builtin owned only by the four test zones. The inactive Stage 1 owner map reserves `mermaid` and `jsdom` for exactly `src/validation/canonical-syntax/mermaid-runtime.ts`, and reserves `commander` for `cli`. Do not add those Stage 1 dependencies during this plan. A bare external import with no owner is `DEP001`; an import from the wrong zone or path is `DEP002`; an imported package absent from the correct dependency section is `DEP003`.

Treat `node:*` and `bun` specifiers as builtins rather than package dependencies. `architecture-tool` and all test zones may use builtins. `cli` may use only `bun`, `node:fs`, `node:fs/promises`, `node:path`, and `node:url`. Canonical Syntax may use `bun` only in the exact future worker-host and worker-entry files. Validation public/root and the Mermaid runtime may not import filesystem or process builtins. Any builtin outside this map reports `DEP002` with the allowed owner in its repair.

Every direct or development dependency must have an exact `x.y.z` version. No optional dependency may appear without a new accepted decision. Forbid package names or subpaths matching Mermaid CLI, Puppeteer, Playwright, image libraries, browser automation, rendering, geometry, vision, or model-provider SDKs already rejected by the roadmap. Require `packageManager: bun@1.3.14`, `engines.bun: 1.3.14`, `bun.lock`, `.bun-version`, the isolated linker, and absence of pnpm/npm/yarn lockfiles. Package imports are compared by package root, so `typescript/lib/...` still belongs to `typescript` and a forbidden package subpath cannot evade the rule.

Use this stable rule catalog; fixture manifests name these identifiers exactly:

    ARCH001 unknown-zone              checked source has no classifier
    ARCH002 forbidden-project-edge    source and target zones are not an allowed pair
    ARCH003 public-seam-bypass        caller bypasses validation or canonical public index
    ARCH004 inactive-stage-path       file or forbidden directory exceeds active stage
    ARCH005 unresolved-project-import relative or repository-alias import does not resolve
    ARCH006 project-cycle             resolved project edges form a cyclic component
    ARCH007 forbidden-test-edge       test deep-import lacks an exact internalTestTargets entry
    DEP001  unowned-package           external package has no owner
    DEP002  dependency-owner          package or builtin is imported outside its owner
    DEP003  undeclared-package        imported package is absent from package metadata
    DEP004  non-exact-version         direct or development version is not exact x.y.z
    DEP005  optional-dependency       optionalDependencies is present without a decision
    DEP006  forbidden-visual-package  deferred visual, browser, image, or model package appears
    TOOL001 bun-version               Bun metadata or .bun-version differs from 1.3.14
    TOOL002 lockfile-policy           required bun.lock is absent or another lockfile is present
    TOOL003 bun-linker                bunfig.toml does not select the isolated linker
    HYG001  generated-source          generated JavaScript or source map appears in checked paths
    HYG002  text-hygiene              a checked text file has trailing whitespace or lacks final LF

Each rule has a stable identifier, short invariant, rationale, and repair. Diagnostics are sorted by importer, source position, rule identifier, and target. A diagnostic names the importer and line, written specifier or metadata field, resolved target or package, the violated rule, and the smallest valid repair. For example:

    ARCH003 public-seam-bypass
    src/cli/main.ts:4 -> src/validation/canonical-syntax/worker-host.ts
    CLI may access Diagram Validation only through src/validation/index.ts.
    Repair: import the public operation from ../validation/index.ts.

Do not add a baseline file, global ignore, inline suppression comment, or “temporary” legacy zone. Any genuine exception is an exact path-scoped rule with a rationale and a removal condition in `policy.ts`.

Focused fixtures must prove allowed behavior and these exact failure mappings: validation importing CLI is `ARCH002`; CLI bypassing `validation/index.ts` and a re-export bypass are `ARCH003`; CLI importing Mermaid and an unauthorized dynamic external import from the wrong owner are `DEP002`; one delivery adapter importing another and product code importing archived compatibility are `ARCH002`; multi-file and type-only cycles are `ARCH006`; an unknown source zone is `ARCH001`; an unowned package is `DEP001`; an unresolved relative import is `ARCH005`; a future-stage directory is `ARCH004`; a visual dependency is `DEP006`; a non-exact package version is `DEP004`; and a test deep import without an exact mapping is `ARCH007`. Each fixture directory contains a small `fixture.json` naming its stage profile and sorted expected rule identifiers. Fixture TypeScript is excluded from the live tsconfig and is copied to a temporary repository before analysis, so intentional violations do not break normal typechecking or the live repository scan.

`tools/architecture/check.ts` scans the real repository, prints every violation in one run, and exits nonzero if any exist. On success it prints a concise count such as `Architecture: clean (N files, M project edges, P package imports)`. Add `bun run architecture` as a fast command and include it in `bun run check` after the checker’s own focused tests.

This milestone is complete when every allowed fixture passes, every forbidden fixture fails with the intended stable rule identifier and repair, the live repository is clean, and intentionally inserting one representative bad import makes `bun run architecture` fail before the ordinary typecheck would explain the architectural repair.

### Milestone 5: Make Bun packing and the harness part of the normal loop

Use Bun’s package packer for the pre-Stage-1 artifact check. Set the still-private bootstrap package's `files` list to exactly `README.md`, `ARCHITECTURE.md`, `DRAFT-PLAN.md`, `docs/adr/0001-validation-foundation.md`, and `docs/adr/0002-bun-toolchain-and-architecture-harness.md`; `package.json` is included by pack semantics. Run `bun pm pack --dry-run` and assert that its listed payload is only those intentional documents plus package metadata. No Stage 0 source, compatibility fixture, snapshot, pnpm lockfile, temporary test fixture, generated JavaScript, or native executable may enter the tarball. Do not publish and do not create a real CLI entrypoint in this plan. Stage 1 must replace this documentation-only allowlist with its actual runtime and declaration files.

Define the final commands so `bun run typecheck` checks all live TypeScript, `bun test` runs all Bun tests, `bun run architecture` runs focused architecture tests and the live checker, `bun run hygiene` runs the repository hygiene gate, and `bun run check` runs typechecking, all tests, the live checker, hygiene, and `bun pm pack --dry-run`. Avoid duplicate expensive work where Bun’s command composition can make each gate run once while keeping the focused commands usable independently.

Record in ADR 0002 and `DRAFT-PLAN.md` that Stage 1 packaging has two proofs. The npm artifact is Bun-targeted ESM with a Bun shebang, external npm dependencies, a `bin` entry, a restrictive `files` list, and a tarball installed and invoked in a clean temporary project. Native release artifacts use `bun build --compile`, disable automatic `.env` and `bunfig.toml` loading, dispatch a hidden `--internal-mermaid-worker` mode in the same executable, and are run natively on every promised target. Cross-compilation alone is not acceptance. Platform matrices, code signing, musl/glibc, and baseline/modern x64 decisions belong to Stage 1 packaging evidence or later release hardening, not this bootstrap.

This milestone is complete when the normal commands are discoverable, deterministic, and green and the dry-run package contents contain only intentional bootstrap files.

### Milestone 6: Trim duplicated prose after enforcement is proven

Only after Milestones 4 and 5 pass, edit `ARCHITECTURE.md`. Keep its purpose and authority, architectural style, domain language, high-level invariants, module-direction and runtime-flow diagrams, Stage 1 target structure, module responsibilities, stage-by-stage growth rationale, test philosophy, and explicitly rejected structures. Update Node-specific terminology to the accepted Bun design.

Replace the detailed allowed-edge table, forbidden-edge enumeration, external-dependency ownership table, checker-selection contract, mandatory negative-fixture list, and repetitive ExecPlan instructions with a short `Executable architecture policy` section. That section points to `tools/architecture/policy.ts`, `tools/architecture/check.ts`, the focused tests, and `bun run architecture`; it explains that prose owns intent while executable policy owns the exact mechanics and repair messages. Do not delete rationale merely because a rule is executable.

Update `AGENTS.md` to remain a small map. It should tell workers to read `DRAFT-PLAN.md` and `ARCHITECTURE.md`, use Bun, run `bun run architecture` after import, dependency, or layout changes, and run `bun run check` before handoff. It should not duplicate the zone matrix.

Run the full checks again after trimming. This milestone is complete only when documentation links resolve, the checker remains green, and a fresh agent can identify the active stage, the high-level architecture, the executable policy, and the required validation commands without reading an obsolete pnpm plan.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. Repository instructions import `/Users/wangzhihao/.codex/RTK.md`, so prefix interactive shell commands with `rtk`.

First verify the recovery boundary:

    rtk git fetch origin codex/archive-stage-0-spike:refs/remotes/origin/codex/archive-stage-0-spike
    rtk git rev-parse origin/codex/archive-stage-0-spike
    rtk git ls-remote --heads origin codex/archive-stage-0-spike

Expect both local and remote references to resolve to:

    0243adb52ef124d3015afd0d272f4a7995a17d23

Verify Bun before modifying package metadata:

    rtk bun --version
    rtk bun --revision

Expect Bun version `1.3.14`. If another version is active, install or select 1.3.14 before continuing.

During Milestone 1, migrate the lockfile while retaining the pnpm file for comparison, inspect the resolved graph, and run the temporary Bun proof:

    rtk bun install --lockfile-only
    rtk bun pm list --all
    rtk bun install --frozen-lockfile
    rtk bun test tests/toolchain/bun-stage0-compatibility.test.ts

The temporary test resolves `src/spike/worker.ts` to an absolute path and passes it as the `workerPath` option. Expect the test transcript to report all 27 canonical cases and the isolation failure cases as passing without first creating `dist/`.

After package metadata and the final `bun.lock` are in place:

    rtk bun install --frozen-lockfile
    rtk bun run typecheck
    rtk bun test
    rtk bun run architecture
    rtk bun run hygiene
    rtk bun pm pack --dry-run
    rtk bun run check

The focused architecture test command is:

    rtk bun test tests/architecture

The live checker command is:

    rtk bun run tools/architecture/check.ts

Use repository searches to confirm cleanup and stage ceilings. These searches should produce no active implementation hit except explicit historical or archive-provenance prose:

    rtk rg -n 'src/spike|src/adapters|pnpm|vitest|NodeNext' --glob '!docs/adr/0001-validation-foundation.md'
    rtk rg --files src/cli src/validation src/lsp src/mcp src/render src/geometry src/vision

The second command is expected to report that those paths do not exist during this bootstrap. Treat any product file as scope expansion and remove it before completion.

Finish with repository-level validation:

    rtk git diff --check
    rtk git status --short
    rtk git diff --stat

When hosted CI is available, require its Bun install and `bun run check` jobs to pass. Record the workflow URL or exact unavailable condition in this plan; do not describe unrun CI as green.

## Validation and Acceptance

Acceptance is behavioral and fail-closed.

The archive is accepted when a clean detached worktree created from `origin/codex/archive-stage-0-spike` contains the original Stage 0 source, fixtures, snapshots, plan, pnpm lockfile, and ADR at commit `0243adb52ef124d3015afd0d272f4a7995a17d23`.

The Bun migration is accepted when Bun 1.3.14 reproduces all 27 direct-official canonical verdicts from Stage 0 with 12 acceptances, 15 rejections, and zero engine failures before the live spike is deleted. Timeout, malformed output, nonzero exit, initialization failure, kill, and subsequent successful execution are distinguishable. The final repository has `bun.lock`, `.bun-version`, `bunfig.toml`, exact Bun metadata, and no `pnpm-lock.yaml`, `.nvmrc`, Node engine promise, or live pnpm command.

The harness is accepted when:

- `bun run architecture` passes on the real repository and prints deterministic file and edge counts.
- Every mandatory allowed fixture passes.
- Every mandatory forbidden fixture fails with its intended stable rule identifier and a repair that points to the valid seam or owner.
- Static imports, re-exports, type imports, dynamic imports, literal require forms, and statically named worker execution edges are recognized.
- The compiler resolves imports with the live Bundler configuration, not a hardcoded NodeNext approximation.
- Each cyclic strongly connected component is reported once with lexicographically sorted member paths.
- Tests have explicit zones; there is no blanket test exemption.
- Package policy rejects unowned packages, non-exact pins, optional dependencies, forbidden visual dependencies, a non-Bun package manager, and inactive-stage directories.
- There is no baseline, wildcard suppression, or legacy spike zone.

The documentation reduction is accepted when `ARCHITECTURE.md` remains sufficient to understand intent and ownership, but no longer duplicates the mechanically enforced edge matrix, package-owner matrix, fixture checklist, or tool-selection instructions. Its executable-policy links and commands work.

The packing contract is accepted at bootstrap when `bun pm pack --dry-run` succeeds and lists no archived spike material or unintentional generated output. Real npm tarball installation, CLI invocation, and native compiled executable tests remain explicit Stage 1 exit work because no CLI exists yet.

The whole plan is accepted when `bun run check` and `git diff --check` pass, hosted CI is green or honestly recorded as unavailable, the worktree contains no Stage 1 product module, and `DRAFT-PLAN.md` still reports Stage 1 as not started.

## Idempotence and Recovery

Archive verification is read-only and may be repeated. The archive branch already exists; do not recreate, reset, delete, merge into, or force-push it. If a worktree recovery directory already exists, reuse it or choose a new sibling path rather than deleting unknown files.

Bun lockfile migration is safe to retry while `pnpm-lock.yaml` remains available. Do not delete the pnpm lock or Stage 0 source until the Bun canonical and isolation proofs pass. If `bun install` changes an exact resolved version, restore package metadata and lockfiles from git, determine why the migration diverged, and rerun. Do not paper over a difference by loosening a direct dependency range.

The Stage 0 cleanup is recoverable because the exact remote branch and commit predate every deletion. If later work needs a fixture or observation, inspect it in a separate worktree and copy only the evidence required by an explicit new plan. Do not reintroduce `src/spike` wholesale or add a permanent harness exemption.

Architecture policy changes should be additive while being tested: add a failing fixture, implement the smallest rule that makes the fixture pass, then run the live repository check. If the live repository exposes an unplanned violation, fix the repository or update the accepted architecture with a recorded decision; do not add a broad ignore.

Trim `ARCHITECTURE.md` last. If the executable policy or its tests later fail, restore the detailed prose from git until the policy is trustworthy. A concise document is an outcome of enforcement, not a substitute for it.

All generated tarballs, temporary repositories, and compiled proof artifacts belong under the system temporary directory or ignored build output. Tests must remove them in `afterEach` or an equivalent `finally` block. Never commit native binaries or `.tgz` proof artifacts in this plan.

## Artifacts and Notes

The immutable-by-convention Stage 0 recovery point is:

    branch: codex/archive-stage-0-spike
    commit: 0243adb52ef124d3015afd0d272f4a7995a17d23
    remote: git@github.com:sanbaiw/mermaid-diagram-validator.git

Remote verification made while authoring this plan produced:

    $ git ls-remote --heads origin codex/archive-stage-0-spike
    0243adb52ef124d3015afd0d272f4a7995a17d23  refs/heads/codex/archive-stage-0-spike

Relevant Bun documentation:

- Bun installation and exact versions: https://bun.com/docs/installation
- Bun TypeScript declarations and compiler settings: https://bun.com/docs/guides/runtime/typescript
- Bun lockfile and pnpm migration: https://bun.com/docs/pm/lockfile
- Bun package-manager utilities and `bun pm pack`: https://bun.com/docs/pm/cli/pm
- Bun child processes: https://bun.com/docs/runtime/child-process
- Bun standalone executables and worker packaging: https://bun.com/docs/bundler/executables
- Bun test runner: https://bun.com/docs/test

The harness-design source for the short instruction map, repository-local system of record, mechanically enforced dependency layers, structural tests, and remediation-oriented lint messages is OpenAI's Harness Engineering report: https://openai.com/index/harness-engineering/.

The repository-local Bun observations made while authoring this plan were:

    $ bun --version
    1.3.14

    $ bun --revision
    1.3.14+0d9b296af

    $ bun pm view @types/bun version
    1.3.14

## Interfaces and Dependencies

At the end of the harness milestone, `tools/architecture/import-graph.ts` exports project-owned structures equivalent to these interfaces. Exact incidental names may change, but their separation of syntax discovery, resolution, policy, and reporting must remain:

    export type EdgeKind =
      | "import"
      | "re-export"
      | "type-import"
      | "dynamic-import"
      | "require"
      | "worker-entry";

    export interface DependencyEdge {
      importer: string;
      specifier: string;
      kind: EdgeKind;
      line: number;
      column: number;
      target:
        | { kind: "project"; path: string }
        | { kind: "package"; name: string }
        | { kind: "builtin"; name: string }
        | { kind: "unresolved" };
    }

    export interface ImportGraph {
      files: readonly string[];
      edges: readonly DependencyEdge[];
    }

    export async function buildImportGraph(
      repositoryRoot: string,
      tsconfigPath: string,
    ): Promise<ImportGraph>;

`tools/architecture/policy.ts` exports the stage profile, zone classifiers, exact package owners, and rules. Rules carry their own remediation context:

    export type Zone =
      | "architecture-tool"
      | "architecture-test"
      | "validation-public"
      | "validation-root"
      | "canonical-public"
      | "canonical-internal"
      | "cli"
      | "contract-test"
      | "cli-integration-test"
      | "internal-test"
      | "lsp"
      | "mcp"
      | "archived-compatibility";

    export interface ArchitectureRule {
      id: string;
      summary: string;
      rationale: string;
      repair: string;
    }

    export interface DependencyOwner {
      kind: "runtime" | "development" | "builtin";
      zones?: readonly Zone[];
      paths?: readonly string[];
      importable: boolean;
    }

    export interface ArchitecturePolicy {
      activeStage: "pre-stage-1" | 1 | 2 | 3 | 4 | 5 | 6;
      classify(path: string): Zone | undefined;
      allowedProjectEdges: Readonly<Record<Zone, readonly Zone[]>>;
      internalTestTargets: Readonly<Record<string, readonly string[]>>;
      minimumStage: Readonly<Partial<Record<Zone, 1 | 2 | 3 | 4 | 5 | 6 | "never">>>;
      inactivePaths: Readonly<Record<string, 2 | 3 | 4 | 5 | 6 | "deferred">>;
      packageOwners: Readonly<Record<string, DependencyOwner>>;
      rules: readonly ArchitectureRule[];
    }

    export const architecturePolicy: ArchitecturePolicy;

`tools/architecture/check.ts` provides a callable function for tests and a command entrypoint for agents:

    export interface ArchitectureViolation {
      ruleId: string;
      importer?: string;
      line?: number;
      column?: number;
      target?: string;
      message: string;
      repair: string;
    }

    export async function checkArchitecture(
      repositoryRoot?: string,
    ): Promise<readonly ArchitectureViolation[]>;

The command writes violations to standard error and sets a nonzero exit code. It must not throw a stack trace for ordinary policy violations.

The final bootstrap direct dependencies are empty. The final development dependencies are exact `typescript@7.0.2` and `@types/bun@1.3.14` unless an implementation-time discovery recorded in this plan proves another harness-only package necessary. Do not add dependency-cruiser, ESLint, a browser, Mermaid CLI, rendering, geometry, image, layout, or model-provider dependencies.

ADR 0002 must prescribe the Stage 1 runtime boundary without implementing it: a Bun process hosts the validation API, Canonical Syntax lives behind one project-owned subprocess host, the subprocess is Bun during development, and a compiled CLI uses a hidden self-exec worker mode. The npm package and native executable builds remain separate. Official Mermaid remains the only syntax verdict.

## Revision Note

2026-07-14: Initial ExecPlan created after the user selected a branch archive for Stage 0, executable enforcement followed by architecture-document trimming, and Bun for runtime and packing. The plan records and remotely verifies the already-pushed archive branch, adds a Bun compatibility gate so the Node-only Stage 0 result is not silently assumed to hold under Bun, and incorporates reviewer feedback by making recovery commands fresh-clone-safe and specifying the executable policy, scripts, and configuration instead of deferring them to the implementer.
