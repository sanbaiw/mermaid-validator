# Deliver the Stage 1 canonical syntax CLI

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at the repository root. It implements only Stage 1, “Canonical syntax CLI,” from `DRAFT-PLAN.md`, within the module boundaries in `ARCHITECTURE.md` and the canonical Mermaid profile accepted by `docs/adr/0001-validation-foundation.md`. It must not add Markdown extraction, repository discovery, configuration loading, custom rules or fixes, LSP, semantic-fact product APIs, MCP, rendering, image, geometry, layout-comparison, or vision behavior.

## Purpose / Big Picture

After this work, a user can point `mermaid-validator` at one `.mmd` or `.mermaid` file and receive the exact-pinned official Mermaid syntax verdict for Flowchart, Sequence, Pie, Class, or State diagrams. A valid diagram exits successfully. Invalid syntax, an officially valid but unsupported diagram family, a command-line or file-input problem, and a parser infrastructure failure produce different stable diagnostics and deterministic process exit codes. The same result is available as compiler-style terminal text or a documented version-1 JSON document.

The user can see the result without knowing this repository’s internals by building once and running:

    pnpm build
    node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
    node dist/cli/main.js fixtures/compatibility/flowchart/invalid-edge.mmd
    node dist/cli/main.js --format json fixtures/compatibility/flowchart/invalid-edge.mmd

The first validation command prints nothing and exits `0`. The second prints one compiler-style `mermaid/syntax-error` finding and exits `1`. The JSON command prints one JSON object with `schemaVersion: 1`, the tool version, the document URI, `valid: false`, and the same finding. `pnpm check` and `pnpm compatibility` remain green on the Node 22 and Node 24 targets established in Stage 0.

## Progress

- [x] (2026-07-14 19:10Z) Authored this Stage 1 ExecPlan after reading all of `AGENTS.md`, `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 0 plan, package/build configuration, current source and tests, and the clean worktree.
- [x] (2026-07-14 19:27Z) Restored the exact Stage 0 dependencies with `pnpm install --frozen-lockfile` and verified the authoring baseline: `pnpm check` passed 7 files / 20 tests and `pnpm compatibility` passed 4 files / 16 tests with the expected 27 fixtures / 108 observations.
- [x] (2026-07-15 16:42Z) Resolved the first design-review branch: keep the module-level `Finding.code` open for future namespaced external rule codes while retaining a separate strongly typed union for project-owned built-in codes.
- [x] (2026-07-15 16:46Z) Resolved the second design-review branch: `ValidationResult.valid` means the overall validation passed with no error-severity Findings, while Finding codes and CLI exit codes preserve whether failure came from input, validation, or validator infrastructure.
- [x] (2026-07-15 16:56Z) Resolved the third design-review branch: classify an unexpected per-request exception in a live worker as `system/parser-runtime-failed`, discard that worker, and restart lazily for the next request.
- [x] (2026-07-15 17:00Z) Resolved the fourth design-review branch and generalized it across the roadmap: Stages 1–5 keep programmatic interfaces private for rapid iteration; Stage 6 decides which interfaces become supported package exports.
- [x] (2026-07-15 17:14Z) Resolved the fifth design-review branch: isolate worker output from product output, discard worker stdout, retain only a bounded internal stderr tail, and never copy raw worker output into Findings, terminal output, or JSON.
- [x] (2026-07-15 17:16Z) Closed the remaining evidence-determined review branches: preserve the Stage 0 raw-type alias map inside the product runtime, parse architecture imports with the existing TypeScript compiler API, and reserve installed-package/bin smoke tests for Stage 6.
- [x] (2026-07-15 17:34Z) Moved Stage 0 Compatibility Evidence from `src/spike/` and `src/adapters/` into `src/compatibility/`; the 27-fixture/108-observation snapshot boundary remained unchanged.
- [x] (2026-07-15 17:39Z) Defined the Stage 1 Diagram Validation types, UTF-16 offset projection, stable outcome mapping, and `validateDocument` operation behind `src/validation/index.ts`.
- [x] (2026-07-15 17:44Z) Implemented the serialized official-Mermaid child worker with bounded startup/request timeouts, FIFO requests, crash/protocol/runtime recovery, cancellation, and bounded private stderr capture.
- [x] (2026-07-15 17:50Z) Added the one-file CLI, terminal and JSON-v1 projections, exact-pinned Commander dependency, private package `bin` mapping, deterministic exit codes, and built-process tests.
- [x] (2026-07-15 17:53Z) Documented JSON-v1 and CLI behavior, updated the Stage 1 roadmap status, and passed the frozen-install, 65-test full gate, and unchanged compatibility gate on Node 22.20.0 and Node 24.18.0. Stage 2 remains unstarted.
- [x] (2026-07-15 18:35Z) Fixed the post-review startup-cancellation leak: when cancellation removes the only queued request while the canonical worker is still initializing, the host now kills and forgets that worker; a delayed-ready regression proves the next request starts a fresh worker. The final gate is now 15 files / 66 tests on Node 22.20.0 and Node 24.18.0.
- [x] (2026-07-15 19:17Z) Resolved the first remaining post-review finding: defer exact closed-shape worker-response validation because the Stage 1 worker and host are compiled and shipped together, while retaining the current structural guard and malformed-IPC coverage.
- [x] (2026-07-15 19:20Z) Resolved the second remaining post-review finding: defer exhaustive direct tests for every defensive raw-type alias; Stage 1 requires real-runtime normalization evidence for spellings emitted by the pinned official profile and retains the broader Stage 0-proven table without adding a synthetic test seam.
- [x] (2026-07-15 19:27Z) Resolved the final post-review finding: extend the focused Stage 1 architecture test across all `src/validation/**` files and require Canonical Syntax project imports to remain inside their subtree, without activating the broader future import-graph checker. The final 15-file/67-test gate and unchanged compatibility gate pass on Node 22.20.0 and Node 24.18.0.

## Surprises & Discoveries

- Observation: Stage 0 is a clean, committed baseline rather than an empty planning repository.
  Evidence: At plan authoring, `git status --short --branch` reported `main...origin/main` with no changes. `package.json` exposes a 20-test `pnpm check` gate, and the compatibility suite owns 27 fixtures and 108 normalized observations.

- Observation: The existing direct official-Mermaid adapter proves the runtime profile but cannot be renamed into product code.
  Evidence: `src/adapters/official-mermaid.ts` returns the evidence-only `EngineObservation` type from `src/spike/contracts.ts`. `ARCHITECTURE.md` explicitly forbids product imports from Compatibility Evidence and requires raw upstream values to stay behind a new Canonical Syntax boundary.

- Observation: Stage 0 process isolation and Stage 1 worker lifecycle solve different problems.
  Evidence: `src/spike/run-isolated.ts` starts one child for an entire engine/corpus observation and returns one evidence row per fixture. Stage 1 needs one reusable official-Mermaid worker, one in-flight parse at a time, a small request/response protocol, per-request timeout behavior, and a restart on the next request after failure.

- Observation: JSDOM is currently a development dependency even though it becomes part of the Stage 1 product runtime.
  Evidence: `package.json` lists `jsdom@26.1.0` under `devDependencies`, while ADR 0001 and `ARCHITECTURE.md` require the product canonical runtime to initialize JSDOM before dynamically importing Mermaid. Stage 1 must move JSDOM into `dependencies` without changing its exact version.

- Observation: The current architecture test deliberately rejects `src/cli/`, so it must be advanced rather than deleted.
  Evidence: `tests/architecture/no-visual-dependencies.test.ts` currently asserts that `src/cli` does not exist. Stage 1 activates that directory, but later-stage and visual directories must remain rejected.

- Observation: Commander `15.0.0` is the current stable release and fits both selected Node lines.
  Evidence: The npm registry and `pnpm view commander@15.0.0` reported version `15.0.0`, no runtime dependencies, built-in TypeScript declarations, and a Node requirement of `>=22.12.0`. This repository already requires `^22.13.0 || >=24.0.0` and has verified Node 22.20.0 and 24.18.0.

- Observation: The checkout initially lacked `node_modules`, but the frozen Stage 0 install remains reproducible.
  Evidence: The first `pnpm check` stopped at `TS2307` missing-module errors for the exact-pinned dependencies. `pnpm install --frozen-lockfile` completed without changing the manifest or lockfile; the immediate full and focused gates then passed with the recorded 20-test and 16-test counts.

- Observation: The proposed unsupported-family fixture is accepted by the pinned canonical profile and exposes its family through both official APIs.
  Evidence: A direct JSDOM/Mermaid `11.16.0` probe returned `detectType(source) === "gantt"` and `parse(source, { suppressErrors: false })` returned `{ diagramType: "gantt", config: {} }`. The existing official evidence adapter also returned `verdict: "accepted"`, `rawDiagramType: "gantt"`, and document precision for the exact fixture recorded in this plan.

- Observation: Stage 0 already records the raw type spellings emitted by the pinned Mermaid profile for every supported target family.
  Evidence: `src/spike/normalize.ts` maps `graph`, `flowchart`, and `flowchart-v2` to Flowchart; `sequence` and `sequenceDiagram` to Sequence; `pie` to Pie; `class` and `classDiagram` to Class; and `state`, `stateDiagram`, and `stateDiagram-v2` to State. Product code cannot import that evidence module, but an independently owned copy of this proven map prevents official aliases from becoming false unsupported-type Findings.

- Observation: The existing toolchain can inspect TypeScript import syntax without another parser dependency, while the private early-stage package has no installed-consumer promise to test.
  Evidence: `typescript@7.0.2` is already exact-pinned, and its compiler API represents static imports, re-exports, and string-literal dynamic imports. `DRAFT-PLAN.md` and `ARCHITECTURE.md` now keep the package private through Stage 5 and place clean-install, public-export, and installed-consumer acceptance in Stage 6.

- Observation: RTK's optimized `pnpm typecheck` path did not preserve this repository's no-emit behavior, while the raw package script did.
  Evidence: Repeated isolated probes showed `rtk pnpm typecheck` materializing untracked `.js` and `.js.map` files under tests and fixtures, while `rtk proxy pnpm typecheck` ran the manifest command and left the tree clean. Final gates therefore use RTK's raw proxy, and repository hygiene now rejects generated JavaScript under source, tests, fixtures, and the Vitest config.

- Observation: TypeScript 7's synchronous project API emits the opened source graph even when its temporary project requests `noEmit`.
  Evidence: Isolated architecture-test runs materialized `.js` beside the live `src/**/*.ts`. The focused import-boundary test now copies `src/` into a temporary repo-local project, performs the same TypeScript-aware NodeNext inspection there, and removes the entire temporary project in `finally`; the live tree remains clean.

- Observation: Source-loaded Vitest modules and the built product need different paths to the compiled worker sibling.
  Evidence: After generated source artifacts were removed, source tests correctly exposed that `src/validation/canonical-syntax/worker-entry.js` does not exist. The host now maps a source-loaded sibling path to the corresponding `dist/` path while built code continues using its actual compiled sibling.

- Observation: Cold Mermaid/JSDOM initialization can exceed Vitest's five-second default on a fresh one-shot process while remaining within the product's ten-second startup budget.
  Evidence: Direct built CLI runs completed in roughly four seconds on the local Node 22 profile, exited without a referenced child handle, and the integration suite stayed green after setting a 20-second test budget rather than changing the parser timeout.

- Observation: Repository hygiene must ignore tracked index entries already removed by an unstaged source move.
  Evidence: `git ls-files --cached` reported the old `src/spike/` and `src/adapters/` paths until staging, causing an `ENOENT`. The checker now skips only missing paths while continuing to inspect every existing tracked and untracked file; no staging was required to validate the migration.

- Observation: A request cancelled during cold worker startup is still queued even though it is the only work keeping the initializing child alive.
  Evidence: The post-review delayed-ready regression first failed because the request following cancellation was handled by the original worker. The queued-cancellation path now discards an unready worker only when no active or queued work remains; the regression passes by observing a second worker launch and a successful later request.

## Decision Log

- Decision: Begin implementation with a behavior-preserving migration of all Stage 0 evidence into `src/compatibility/`.
  Rationale: The accepted architecture names that module and requires product code to stay independent from the old spike contracts. Moving it while only the existing 20 tests run creates a clean checkpoint before product behavior changes. The compatibility snapshot must not be updated during this move.
  Date/Author: 2026-07-15 / Codex

- Decision: Reimplement the official profile inside `src/validation/canonical-syntax/mermaid-runtime.ts` instead of sharing the Compatibility Evidence adapter.
  Rationale: The two paths have different contracts and purposes. Compatibility Evidence remains an independent oracle; the product runtime returns internal Syntax Outcomes and owns lifecycle behavior. A small duplication of JSDOM setup and the accepted Mermaid profile preserves the required dependency direction.
  Date/Author: 2026-07-15 / Codex

- Decision: Stage 1 accepts exactly one explicit file path ending in `.mmd` or `.mermaid`, case-insensitively.
  Rationale: File discovery, ignore rules, Markdown extraction, and multiple repository inputs belong to Stage 2. One explicit standalone file is the smallest surface that proves the Stage 1 product end to end.
  Date/Author: 2026-07-15 / Codex

- Decision: An unsupported diagram type means source that official Mermaid successfully parses but whose detected family is outside Flowchart, Sequence, Pie, Class, and State.
  Rationale: A malformed or unknown header is a Mermaid syntax error. A valid `gantt` diagram is a clearer proof of the product’s supported-family boundary and lets syntax errors and unsupported families have distinct codes without guessing from parser messages.
  Date/Author: 2026-07-15 / Codex

- Decision: Use a lazily started, persistent Node child process with JSON-serializable IPC and exactly one in-flight request.
  Rationale: Mermaid and JSDOM mutate process-global state. Serialization keeps canonical parsing deterministic, persistence avoids a cold import per validation call, IPC avoids stdout corruption, and a child process can be killed and recreated after a timeout or crash. The host refs the child while work is pending and unrefs it while idle so a completed one-shot CLI can exit naturally.
  Date/Author: 2026-07-15 / Codex

- Decision: Use stable built-in finding codes `mermaid/syntax-error`, `mermaid/unsupported-diagram-type`, `system/parser-initialization-failed`, `system/parser-timeout`, `system/parser-runtime-failed`, `system/parser-crashed`, and `system/parser-protocol-error`.
  Rationale: Callers need to branch on project-owned codes rather than Mermaid message text. Separate system codes preserve useful failure provenance while all of them map to the same CLI infrastructure-failure exit class.
  Date/Author: 2026-07-15 / Codex

- Decision: Classify an unexpected exception thrown while a live, initialized worker handles a parse request as `system/parser-runtime-failed`, then discard the worker and start a fresh one only when another request needs it.
  Rationale: A caught runtime exception is not a syntax rejection, process crash, or malformed IPC exchange. Giving it a truthful stable code prevents consumers from drawing the wrong operational conclusion, while replacing the worker avoids trusting potentially corrupted Mermaid or JSDOM global state.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Keep the Diagram Validation module's `Finding.code` field typed as `string`, and define the Stage 1 project-owned codes separately as `BuiltInFindingCode`.
  Rationale: The Stage 3 plugin contract requires external namespaced rule codes without editing a closed project union. A separate built-in union preserves compile-time checking for project-owned producers while JSON, CLI, LSP, and other consumers remain forward-compatible with unknown plugin codes. Rule registration will validate the namespaced code format when Stage 3 activates; Stage 1 must not add that later-stage registration behavior early.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Define `ValidationResult.valid` as `true` exactly when no Finding has `severity: "error"`. Use exit code `0` when the result is valid, `1` when it contains a non-system error, `2` for command usage or file-input errors that prevent creation of a Validation Result, and `3` when it contains any system error.
  Rationale: `valid` describes whether the overall validation passed; it is not a second representation of the official Mermaid syntax verdict. Finding codes distinguish syntax rejection, unsupported families, future rule failures, and validator infrastructure failures. System-error precedence ensures automation never mistakes an incomplete validation for an ordinary document failure, while future warning- or info-only rule results remain successful.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Keep the Stage 1 module-level `DocumentSnapshot.languageId` and validation mode narrow: `languageId` is only `"mermaid"`, and `ValidateOptions.mode` is optional but, when present, only `"canonical"`.
  Rationale: `DRAFT-PLAN.md` shows the eventual Markdown/MDX and fast-mode shape, but pretending those values work in Stage 1 would create placeholder behavior. Adding literals to these unions in later active stages is an additive API change.
  Date/Author: 2026-07-15 / Codex

- Decision: Public cancellation rejects with an `AbortError`; every non-cancellation parser failure returns a `ValidationResult` with a system Finding.
  Rationale: Cancellation is caller control flow rather than a diagnostic about the document or engine. This gives the later LSP adapter a conventional stale-work path while keeping ordinary CLI validation non-throwing.
  Date/Author: 2026-07-15 / Codex

- Decision: Add exact-pinned `commander@15.0.0`, move exact-pinned `jsdom@26.1.0` into runtime dependencies, and move compatibility-only `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` into development dependencies.
  Rationale: Commander is the CLI framework already selected by the roadmap and supports the verified Node range. JSDOM is required by the shipped canonical runtime. Mermaid-lint and Merman remain evidence-only during Stage 1 and should not enlarge the installed product runtime graph.
  Date/Author: 2026-07-15 / Codex

- Decision: Do not add a code-frame dependency in Stage 1.
  Rationale: Absolute host UTF-16 offsets plus a deterministic `path:line:column: severity code: message` line satisfy the compiler-style diagnostic requirement. A code frame can be evaluated later if real use shows that the extra dependency materially improves the terminal experience.
  Date/Author: 2026-07-15 / Codex

- Decision: Make JSON `schemaVersion` the integer `1`, omit raw Mermaid payloads, and document additive compatibility rules in `docs/reference/json-output-v1.md`.
  Rationale: Consumers need one explicit discriminator and a small stable envelope. Raw Mermaid errors are version-specific and prohibited by the architecture. A prose contract plus contract tests is enough for Stage 1; no JSON Schema validator dependency is needed.
  Date/Author: 2026-07-15 / Codex

- Decision: Set the package version to `0.1.0` and add the `mermaid-validator` bin entry, but keep `private: true` and do not publish, tag, or commit during this plan unless the user separately asks.
  Rationale: Stage 1 is the roadmap’s `v0.1` release cut, while publication and Git mutations are external actions outside the present request.
  Date/Author: 2026-07-15 / Codex

- Decision: Treat `src/validation/index.ts` as a repository module seam rather than an npm programmatic interface, and generalize that policy through Stage 5.
  Rationale: Early validation, extraction, rule, LSP, and Semantic Facts contracts need implementation feedback before they acquire external compatibility obligations. Stages 1–5 therefore keep the package private, leave TypeScript declaration emission disabled, add no package `exports` or `types` entry, and make no supported `import` claim. Stage 6 decides which interfaces are mature enough for declarations, explicit exports, installed-consumer tests, and migration policy.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Give the Canonical Syntax child an ignored stdin and stdout, a piped stderr, and one IPC channel. Drain stderr continuously, retain only its final 4,096 UTF-16 code units as internal `debugDetail`, and never project that detail into a Finding or delivery output.
  Rationale: Structured IPC is the only worker-to-product protocol. Raw stdout can corrupt JSON, while raw stderr may contain unstable stacks, absolute paths, source fragments, or dependency internals and cannot be reliably associated with a stable product diagnostic. Bounded internal capture preserves implementation-time evidence without creating an accidental output contract. Stage 1 adds no user-visible debug mode; a future explicit debug facility requires its own design.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Own a private raw-type alias table inside `mermaid-runtime.ts`, with the same proven aliases as Stage 0, instead of importing Compatibility Evidence or creating a separate normalization module.
  Rationale: Official Mermaid returns multiple raw names for the five supported families. The product boundary must canonicalize those names consistently, but Compatibility Evidence must remain an independent oracle and a one-table helper file would be a shallow abstraction. A successful parse result is authoritative for the raw type, with `detectType()` only as a fallback when that result lacks a usable type. Recognized aliases map to the five product-owned target names; a successfully parsed unrecognized official type remains unsupported under its raw name; if both official results lack a usable type, the outcome is a protocol failure. On syntax rejection, a recognized detected alias may enrich the Finding with its canonical target name but cannot change the rejection verdict.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Implement the focused Stage 1 import-boundary test with the existing TypeScript 7 API rather than regular expressions or a new dependency.
  Rationale: The `typescript/unstable/sync` project API supplies parsed source files and checker-resolved module symbols, while `typescript/unstable/ast` walks static imports, re-exports, and string-literal dynamic imports. A temporary copy contains the API's emitter side effect while preserving actual NodeNext resolution, without adding a parser dependency or pretending to build the generalized future import-graph checker.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Test Stage 1 CLI behavior by spawning `node dist/cli/main.js`; do not pack, install, or claim the `mermaid-validator` command works from an installed package yet.
  Rationale: Stage 1 still prepares the shebang and `package.json` bin mapping, but the package remains private through Stage 5. A pack/install smoke test would turn an uncommitted publication shape into an accidental acceptance contract. Stage 6 already owns clean-install and installed-package consumer tests and will validate the real bin there.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Do not make the Stage 1 worker-response guard an exact closed-shape protocol validator.
  Rationale: The worker and host are compiled, versioned, and shipped together, so Stage 1 has no independent or untrusted IPC participant and no version-skew compatibility case. The existing structural guard rejects gross malformed messages and prevents worker-supplied `debugDetail` from crossing IPC. Exact key allowlists, canonical-version equality checks, and exhaustive optional-field validation are deferred until the protocol crosses a real trust or version boundary, or a concrete malformed-field defect demonstrates the need.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Do not require a direct Stage 1 test for every defensive entry in the private raw-type alias table.
  Rationale: The exact-pinned official runtime does not naturally emit every Stage 0-proven spelling through the product's authoritative successful-parse path. Stage 1 keeps real-runtime coverage for the spellings observed from official `parse()` and `detectType()` across the target corpus, and retains the additional aliases as low-cost defensive compatibility. A synthetic Mermaid seam or table-only test is deferred until alias normalization becomes an independently meaningful contract or an observed regression demonstrates the need.
  Date/Author: 2026-07-16 / User and Codex

- Decision: Enforce the active Diagram Validation boundary across every `src/validation/**` file during Stage 1.
  Rationale: Canonical Syntax is already an active deep module, so preventing it from importing CLI or Compatibility Evidence is current architecture protection rather than speculative future checking. The focused test now also requires Canonical Syntax project imports to remain inside its subtree and proves that a delivery-adapter edge is rejected. Cycle detection, generalized zone fixtures, and the broader import-graph system remain deferred until their planned stage.
  Date/Author: 2026-07-16 / User and Codex

## Outcomes & Retrospective

Stage 1 delivered the planned private `v0.1.0` canonical syntax validator without activating later-stage or visual scope. The built CLI validates one `.mmd` or `.mermaid` file for Flowchart, Sequence, Pie, Class, or State; distinguishes syntax, unsupported family, input, and parser-infrastructure outcomes; emits compiler-style terminal lines or documented JSON-v1; and exits with codes `0`, `1`, `2`, or `3` by the accepted precedence.

The repository-internal `src/validation/index.ts` seam returns deterministic findings with original-document UTF-16 spans where Mermaid supplies approximate coordinates. The canonical worker serializes concurrent calls, reuses an accepted/syntax-rejecting worker, restarts after runtime/timeout/crash/protocol failure, honors queued and in-flight cancellation, bounds private stderr to 4,096 UTF-16 code units, and does not leak raw worker output or keep the one-shot CLI alive.

The final gates passed on Node 22.20.0 and Node 24.18.0: `pnpm check` passed 15 test files / 67 tests, and `pnpm compatibility` passed 4 files / 16 tests. Compatibility Evidence stayed at 27 fixtures / 108 observations, the two known `pie-invalid-header` noncanonical mismatches, 5/5 coordinate expectations, and 12/12 complete selected Merman fact summaries. Product runtime dependencies are only Commander `15.0.0`, JSDOM `26.1.0`, and Mermaid `11.16.0`; the package remains private with no `exports` or `types` field. Post-implementation review fixed cancellation during worker startup, explicitly deferred exact closed-shape IPC validation and exhaustive defensive-alias tests, and completed enforcement of the active Diagram Validation import boundary.

Implementation differed from the written mechanics only where live evidence required it: TypeScript 7's current project/AST APIs replaced the older `ts.createSourceFile` sketch, the source-test worker path maps to the compiled `dist` sibling, and the integration test budget accounts for cold parser initialization. These are test/lifecycle details, not architecture changes, so `ARCHITECTURE.md` and ADR 0001 required no revision. Stage 2 remains unstarted.

## Context and Orientation

The repository is one private TypeScript ESM package built with pnpm and strict NodeNext TypeScript. `.nvmrc` pins Node 24.18.0, while `package.json` and CI also support the verified Node 22 line. `tsconfig.build.json` compiles `src/**/*.ts` into the same relative layout beneath `dist/`. `vitest.config.ts` runs Node-environment tests serially. `pnpm check` performs typechecking, a build, repository hygiene, and the full Vitest suite. `pnpm compatibility` builds and reruns the Stage 0 compatibility evidence.

`DRAFT-PLAN.md` is the authority for stage scope and exit criteria. Stage 1 must implement the module-level document, finding, result, canonical worker, standalone CLI, terminal reporter, JSON reporter, version option, and exit codes. Stage 2 owns repository discovery and Markdown. Stage 3 owns the candidate rule and fix contract. Stage 4 owns LSP. Stage 5 owns product Semantic Facts. Stage 6 owns MCP and CI output formats and decides which programmatic contracts become public package exports. The deferred visual roadmap owns every render, image, geometry, layout, and vision concern.

`ARCHITECTURE.md` is the authority for module ownership and dependency direction. The product bounded context is Diagram Validation. `src/validation/index.ts` is its only repository module import seam; it is not a package-level programmatic export in Stage 1. The CLI is a Delivery Adapter: it may import its own files and `src/validation/index.ts`, but no deeper validation path. Diagram Validation may call the internal Canonical Syntax module but may not import CLI, Compatibility Evidence, or any future delivery adapter. Only `src/validation/canonical-syntax/mermaid-runtime.ts` in product code may import `mermaid` or `jsdom`. Only the Canonical Syntax worker host and Compatibility Evidence process runner may import `node:child_process`.

ADR 0001 fixes the canonical profile at `mermaid@11.16.0` under JSDOM `26.1.0` with:

    {
      "startOnLoad": false,
      "securityLevel": "strict",
      "suppressErrorRendering": true
    }

The runtime must install JSDOM globals before dynamically importing Mermaid, may call `detectType()` to learn a diagram family, and must always await `parse(source, { suppressErrors: false })` before it returns an accepted or unsupported-family outcome. Official Mermaid is the only syntax authority.

The existing `src/spike/` and `src/adapters/` trees are Compatibility Evidence. Their `CompatibilityCase`, `EngineObservation`, selected facts, matrix reports, and isolated-engine contracts are not product types. The completed corpus has 12 valid and 15 invalid fixtures across Flowchart, Sequence, Pie, Class, and State. Four engine paths create 108 observations. These files and snapshots must survive a move into `src/compatibility/` without semantic changes.

Use these terms consistently:

- A **Document Snapshot** is an immutable in-memory view of one source document. In Stage 1 it contains a file URI, `languageId: "mermaid"`, source text, and an optional version.
- A **Finding** is one stable user-facing diagnostic owned by this project. It does not expose a Mermaid error object.
- A **Validation Result** contains the document identity, all Findings from one validation call, and a `valid` flag that is true exactly when none of those Findings has error severity. The flag describes whether the overall validation passed, not whether official Mermaid independently accepted the syntax; callers inspect Finding codes to distinguish syntax rejection, unsupported input, rule failure, and indeterminate system failure.
- A **Canonical Syntax Outcome** is the internal accepted, syntax-error, unsupported-family, or infrastructure-failure result returned by the worker host. It never crosses `src/validation/index.ts`.
- A **host offset** is a zero-based index counted in UTF-16 code units in the original document text. JavaScript string indices already use UTF-16 code units. A span is half-open: `startOffset` is included and `endOffset` is excluded.
- **Location precision** is `exact`, `approximate`, or `document`. Stage 1 Mermaid parser coordinates are approximate. When Mermaid supplies no usable coordinate, the finding has document precision and no span.
- A **Delivery Adapter** translates an external interaction into a Document Snapshot and a Validation Result into an external representation. The Stage 1 CLI is the only active delivery adapter.

At the end of Stage 1, the relevant source tree is:

    src/
      validation/
        index.ts
        document.ts
        findings.ts
        source-offsets.ts
        validate-document.ts
        canonical-syntax/
          index.ts
          protocol.ts
          worker-host.ts
          worker-entry.ts
          mermaid-runtime.ts
          normalize-mermaid-error.ts
      cli/
        main.ts
        terminal-output.ts
        json-v1-output.ts
      compatibility/
        contracts.ts
        hygiene.ts
        normalize.ts
        report.ts
        run-isolated.ts
        versions.ts
        worker.ts
        engines/
          official-mermaid.ts
          mermaid-lint.ts
          merman.ts

Do not create `src/lsp/`, `src/mcp/`, `src/extraction/`, `src/rules/`, `src/facts/`, `src/reporters/`, `src/render/`, `src/geometry/`, or `src/vision/`. Terminal and JSON output stay inside `src/cli/` because there is only one caller.

## Plan of Work

### Milestone 1: Establish the Compatibility Evidence boundary without behavior changes

First move the current Stage 0 source into the accepted supporting-module location. Move `src/spike/contracts.ts`, `hygiene.ts`, `normalize.ts`, `report.ts`, `run-isolated.ts`, `versions.ts`, and `worker.ts` to the same filenames under `src/compatibility/`. Move `src/adapters/official-mermaid.ts`, `mermaid-lint.ts`, and `merman.ts` under `src/compatibility/engines/`. Update only relative imports, test imports, build-time worker paths, and the `package.json` hygiene command from `dist/spike/hygiene.js` to `dist/compatibility/hygiene.js`.

Keep the four engine IDs, profile, fixture manifest, normalization, expected coordinate ranges, selected facts, human-readable summary, and snapshots unchanged. The default Compatibility Evidence worker path becomes `dist/compatibility/worker.js`. The direct official observer remains independent evidence and stays allowed to import Mermaid and JSDOM beneath `src/compatibility/engines/`.

Advance `tests/architecture/no-visual-dependencies.test.ts` from its Stage 0 assumption. It must allow the now-active `src/cli/` and `src/validation/` paths once later milestones create them, continue enforcing exact direct pins and no optional dependencies, and keep every later-stage or visual directory absent. Update the test description so it states the active non-visual dependency boundary instead of “Stage 0.” Do not weaken the forbidden package list.

Before adding any product file, run `pnpm check` and `pnpm compatibility`. Expect the same 20 passing tests, the same 27-fixture/108-observation summary, and no snapshot diff. If a snapshot changes, stop and correct the migration; moving files is not a reason to update evidence.

This milestone is complete when no TypeScript file imports `src/spike/**` or `src/adapters/**`, those old directories no longer exist, and the Stage 0 behavior is byte-for-byte stable at the normalized snapshot boundary.

### Milestone 2: Define the Diagram Validation module contract and stable mapping

Create `src/validation/document.ts`, `findings.ts`, `source-offsets.ts`, `validate-document.ts`, and `index.ts`. `index.ts` is the only file repository callers outside `src/validation/` may import. It re-exports the Stage 1 module types and `validateDocument`; it must not export Syntax Outcomes, worker hosts, protocol messages, JSDOM helpers, raw Mermaid errors, or test injection seams. Do not enable declaration output or add `package.json` `exports` or `types`; this seam is private to the package through Stage 5.

Define the module contracts exactly as shown in `Interfaces and Dependencies`. `validateDocument` defaults to canonical mode, invokes only `checkCanonicalSyntax` from `src/validation/canonical-syntax/index.ts`, maps one internal outcome to zero or one Stage 1 Finding, derives `valid` as `findings.every((finding) => finding.severity !== "error")`, and returns a deterministic result. It returns no Finding for accepted source. It returns a Mermaid-source error for invalid syntax or an officially valid unsupported family. It returns a system-source error for initialization, timeout, runtime, crash, or protocol failure. Except for an `AbortError` caused by the caller’s signal, it must not leak a worker rejection or raw upstream error. A system error therefore returns `valid: false` because validation did not pass, but it does not assert that the document's Mermaid syntax is invalid. When an internal engine-failure outcome contains `debugDetail`, the mapping must discard it and use only the project-owned stable message for the Finding.

Implement line/column-to-offset conversion in `src/validation/source-offsets.ts`, not in the CLI. Mermaid’s normalized internal coordinate uses a one-based line and one-based column. Convert it against the original JavaScript string, clamp it to the named line and document, and return a half-open span. With line and column, highlight one UTF-16 code unit when one exists. With only a line, span that line excluding the line terminator. With no usable location, omit the span and keep document precision. Support LF and CRLF and prove that astral Unicode before a diagnostic is counted as two UTF-16 code units.

Add `tests/contract/validation/validate-document.test.ts`. It imports only `src/validation/index.ts`. Use the existing compatibility fixture files as black-box inputs, not their evidence types. Prove all valid target fixtures return `valid: true` with no Findings and all invalid target fixtures return `valid: false` with `mermaid/syntax-error`. Add an officially valid Gantt fixture at `tests/fixtures/cli/unsupported-gantt.mmd` and prove it returns `mermaid/unsupported-diagram-type` with document precision. Assert the exact Mermaid engine name/version and assert that serialized results do not contain `hash`, `stack`, JSDOM values, or absolute worker paths.

Add narrow internal tests under `tests/internal/validation/` for offset conversion and outcome-to-Finding mapping. Those tests may import the implementation file they exercise, but they must not become examples for delivery adapters. Inject each infrastructure outcome to prove the seven stable built-in Finding codes and prove `valid` is derived from findings rather than trusted from the worker.

Add an architecture test that uses the already installed TypeScript compiler API, not regular expressions or another dependency, to read the actual Stage 1 imports. Parse each source with `ts.createSourceFile`, walk static import declarations, re-export declarations with module specifiers, and string-literal dynamic imports, and resolve local targets with TypeScript's NodeNext-aware module resolution. Verify the active edges: CLI files import only their own subtree and `src/validation/index.ts`; validation root files do not import CLI or Compatibility Evidence; validation root files reach Canonical Syntax only through its `index.ts`; product Mermaid/JSDOM imports occur only in `mermaid-runtime.ts`; Commander imports occur only in `src/cli/`; and Compatibility Evidence never becomes a product dependency. This is a focused assertion over the active graph, not a claim that the repository has already implemented the generalized future import-graph checker described in `ARCHITECTURE.md`.

This milestone is complete when a repository delivery adapter or contract test can import only `src/validation/index.ts`, validate all five target fixture families, distinguish syntax, unsupported type, and injected infrastructure failures by stable code, and observe correct UTF-16 host spans where Mermaid supplied approximate coordinates. It must not be possible or documented to import that interface through the installed package.

### Milestone 3: Implement reliable Canonical Syntax isolation

Create `src/validation/canonical-syntax/protocol.ts`, `mermaid-runtime.ts`, `normalize-mermaid-error.ts`, `worker-entry.ts`, `worker-host.ts`, and `index.ts`. The Canonical Syntax module is internal to Diagram Validation. `index.ts` exposes only `checkCanonicalSyntax` and the internal Syntax Outcome type needed by `validate-document.ts`. Root validation files must not deep-import worker implementation files.

In `protocol.ts`, define JSON-serializable IPC messages with a monotonically increasing request ID. The worker sends one ready message after Mermaid and JSDOM initialize. The host sends one validate request containing only the request ID and source string. The worker sends one response containing a normalized Syntax Outcome. It may send one initialization-failed message before exit. Do not send an Error instance, stack, JSDOM node, Mermaid parser hash, function, or class across IPC.

In `mermaid-runtime.ts`, install the required JSDOM globals before the first dynamic `import("mermaid")`, initialize the exact ADR 0001 profile once, and expose one internal asynchronous parse operation. Keep a private table in this file that maps `graph`, `flowchart`, and `flowchart-v2` to `flowchart`; `sequence` and `sequenceDiagram` to `sequence`; `pie` to `pie`; `class` and `classDiagram` to `class`; and `state`, `stateDiagram`, and `stateDiagram-v2` to `state`. Do not import or re-export the Compatibility Evidence table and do not create a separate one-function normalization module. For every source, attempt `detectType()` for family information and always await official `parse()` with errors enabled. Prefer a non-empty string from the successful parse result and use a non-empty detected type only as a fallback. If parsing rejects, normalize it as a syntax error; the parser message, available coordinates, and a recognized detected alias may enrich that outcome but may not change its stable kind. If parsing succeeds and the chosen raw type matches the private table, return accepted with the canonical target name. If parsing succeeds with another official family such as Gantt, return unsupported type with the raw official name. If official parsing succeeds but neither official result yields a non-empty string, return a protocol infrastructure failure because the product cannot apply its supported-family boundary safely. No independent parser participates.

In `normalize-mermaid-error.ts`, keep all knowledge of raw Mermaid error shapes. Prefer `hash.loc.first_line` over `hash.line`, matching the hardened Stage 0 evidence, and convert `first_column` from zero-based to one-based. Collapse whitespace in the useful parser message, retain at most 500 UTF-16 code units, and prefix it with the stable text `Mermaid syntax error:`. Mark any parser-derived coordinate approximate. Do not expose expected-token arrays, stacks, or the raw hash.

In `worker-entry.ts`, initialize the runtime before sending ready, then process requests sequentially. A rejected parse produces a normal response, not a worker crash. An initialization failure sends a bounded project-owned initialization-failed message and exits nonzero; it does not serialize the caught Error, stack, or raw dependency text. A truly unexpected exception while handling a request produces an engine-failure outcome with `failure: "runtime"` and a bounded project-owned message for that request. The host settles it as `system/parser-runtime-failed`, discards the worker even though the process remains alive, and starts a fresh worker only when another request needs one.

In `worker-host.ts`, lazily fork the compiled sibling `worker-entry.js` with `stdio: ["ignore", "ignore", "pipe", "ipc"]`. IPC is the only protocol channel. Maintain one FIFO queue and at most one in-flight request. Continuously drain the stderr pipe so the worker cannot block, retain only its final 4,096 UTF-16 code units, and attach that tail only as optional internal `debugDetail` on an engine-failure outcome. Never copy `debugDetail` into the stable `message`, a Finding, terminal output, JSON, or parent-process stderr. Destroy the stderr pipe whenever the child is discarded or disposed.

Use separate bounded startup and per-request timers, initially 10 seconds each. On startup failure, timeout, exit, signal, malformed message, mismatched ID, or disconnected IPC, settle the current request with the corresponding infrastructure outcome, kill and forget the child, and start a fresh child only when another request needs one. Ref the child and IPC channel while a request is pending and unref them while idle, so the repository-internal API can reuse the worker but the one-shot CLI is not kept alive after output. The stderr pipe must not leave an active handle that prevents exit. Provide an internal `dispose()` and injectable worker path/timeouts only for internal tests; do not re-export them through `src/validation/index.ts`.

Honor `AbortSignal`. If a queued request is aborted, remove it and reject with an `AbortError`. If the in-flight request is aborted, kill and forget the worker, reject only that call with `AbortError`, and allow the next queued request to start on a fresh worker. Cancellation is not a Finding.

Add fake Stage 1 worker fixtures under `tests/fixtures/workers/` for initialization failure, timeout, caught per-request runtime failure, crash, malformed IPC, mismatched request ID, restart-after-failure, and noisy stdout/stderr. The noisy fixture writes unique markers to both raw streams before returning or failing through IPC. Add `tests/internal/canonical-syntax/worker-host.test.ts` to prove FIFO serialization, no two in-flight requests, each failure classification, cancellation, bounded stderr-tail capture, and a successful request after a discarded or killed worker. Add actual-runtime tests for one valid and one invalid fixture per target family plus the unsupported Gantt fixture. Across those tests, prove normalization for the raw spellings that the pinned official `parse()` and `detectType()` paths actually emit on the target corpus. Retain the broader Stage 0-proven private alias table as defensive compatibility, but do not introduce a synthetic Mermaid seam solely to exercise spellings the official product path does not currently emit. Reuse the Stage 0 corpus files where possible; do not change the compatibility matrix merely to create alias coverage.

This milestone is complete when one process can make several canonical validation calls through the same worker, concurrent calls are serialized, syntax rejection does not restart the worker, runtime failure, timeout, and crash do restart it, the request following a failure succeeds, and a completed caller can exit without a leaked child-process handle.

### Milestone 4: Deliver the one-file CLI and both output contracts

Add exact-pinned Commander with pnpm. Move JSDOM to runtime dependencies and the two compatibility-only engines to development dependencies without changing any evaluated version. Keep every direct dependency as an exact `x.y.z` string and keep `optionalDependencies` absent. Keep the exact values in `src/compatibility/versions.ts` unchanged, and update `tests/architecture/engine-versions.test.ts` to compare them against the merged runtime and development dependency maps so evidence-only placement remains intentional and tested.

Update `package.json` to version `0.1.0`, retain `private: true`, set the description to the Stage 1 syntax validator, add no `exports` or `types` field, and add only this executable entry:

    "bin": {
      "mermaid-validator": "./dist/cli/main.js"
    }

Create `src/cli/main.ts` with a Node shebang. Define a `runCli` function with injectable I/O and validation dependencies for focused tests, and call it only when the built file is the executed entry point. Configure Commander with one required `<file>` argument, `--format <terminal|json>` defaulting to `terminal`, `--version`, and help. Override Commander exits so usage errors return code `2` instead of terminating imported tests. `--version` prints `0.1.0`, exits `0`, and does not start the parser worker.

Resolve the file path, require a case-insensitive `.mmd` or `.mermaid` extension, read it as UTF-8, and create a `file:` URI with `pathToFileURL`. An unsupported extension, missing file, directory, permission error, or invalid command option is a CLI/input error: write one concise message to stderr, write no JSON or terminal validation result, and return `2`. Do not discover siblings, expand globs, load config, read Markdown, or follow URLs.

Create `src/cli/terminal-output.ts`. A valid result renders the empty string. Each Finding renders one line on stdout in one of these forms:

    /absolute/path/diagram.mmd:2:6: error mermaid/syntax-error: Mermaid syntax error: <bounded detail>
    /absolute/path/diagram.mmd: error mermaid/unsupported-diagram-type: Mermaid diagram type "gantt" is not supported
    /absolute/path/diagram.mmd: error system/parser-timeout: Canonical Mermaid parser timed out after 10000ms

Derive terminal one-based line and column from the Finding’s absolute UTF-16 start offset and the original source. Use the snapshot's absolute local path consistently; do not store terminal coordinates in the Finding module contract, leak temporary worker paths, or use ANSI color or code frames in Stage 1.

Create `src/cli/json-v1-output.ts`. It returns one trailing-newline-terminated JSON object with stable key ordering and this shape:

    {
      "schemaVersion": 1,
      "tool": {
        "name": "mermaid-diagram-validator",
        "version": "0.1.0"
      },
      "document": {
        "uri": "file:///absolute/path/diagram.mmd"
      },
      "valid": false,
      "findings": [
        {
          "code": "mermaid/syntax-error",
          "severity": "error",
          "message": "Mermaid syntax error: <bounded detail>",
          "source": "mermaid",
          "span": {
            "startOffset": 18,
            "endOffset": 19
          },
          "locationPrecision": "approximate",
          "diagramType": "flowchart",
          "engine": {
            "name": "mermaid",
            "version": "11.16.0"
          }
        }
      ]
    }

Omit optional fields rather than serializing them as `null`. Preserve finding order. JSON mode writes only JSON to stdout for every validation result, including system findings. Terminal mode also writes validation findings to stdout. Stderr is reserved for command usage and file-input errors.

Map the returned result to exit codes in this precedence order: a result containing any `source: "system"`, `severity: "error"` Finding is `3`; otherwise a result containing any error-severity Finding, including Mermaid and future rule Findings, is `1`; a result with no error-severity Finding is `0`; and a CLI usage or file-input error that prevents creation of a Validation Result is `2`. Focused CLI tests may inject Validation Results to prove system-error precedence, future rule-error handling, and warning-only success without activating the Stage 3 rule engine. The built-process tests must exercise the real worker for valid, syntax-error, and unsupported-family cases.

Add `tests/integration/cli/cli.test.ts` that spawns `node dist/cli/main.js`. Test a valid fixture from each of the five target families, representative invalid fixtures, unsupported Gantt, both supported extensions, uppercase extension acceptance, JSON output, version, help, bad format, missing input, unsupported extension, and unreadable or missing path behavior. Parse JSON rather than snapshotting absolute temporary paths. Assert stdout, stderr, and process status separately. Also assert the built entry has its shebang and `package.json` points the future `mermaid-validator` bin at it. Do not run `pnpm pack`, install a tarball, invoke a linked package bin, or treat installed-package behavior as Stage 1 acceptance; Stage 6 owns that smoke test.

Add focused reporter tests for approximate line/column, line-only spans, document-only Findings, CRLF, and astral Unicode. Add JSON contract tests that assert `schemaVersion: 1`, exact required fields, omitted absent fields, deterministic serialization, and the absence of raw engine data.

This milestone is complete when direct execution of the built CLI demonstrates all five target families, terminal and JSON findings agree with the in-memory result, `--version` is worker-free, all four exit-code classes are covered, and no installed-package behavior is claimed.

### Milestone 5: Close the Stage 1 release cut and preserve the next boundary

Create `docs/reference/json-output-v1.md`. Define the JSON envelope and every field in plain language, state that offsets are zero-based UTF-16 and spans are half-open in the original standalone document, enumerate the stable Stage 1 finding codes, document `schemaVersion: 1`, and state the compatibility rule: patch releases may add optional fields but may not remove or reinterpret existing fields; a breaking shape change requires a new schema version. Include one valid, one syntax-error, one unsupported-family, and one system-failure example without raw Mermaid internals.

Update `README.md` with installation/build instructions for this private checkout, the one-file CLI syntax, supported extensions and five diagram families, terminal/JSON examples, exit codes, Node/pnpm requirements, and links to JSON-v1 documentation and ADR 0001. Remove the statement that the product CLI is not implemented. Say explicitly that Markdown, repository discovery, rules, LSP, Semantic Facts, MCP, and visual validation are not yet implemented, and do not document any package-level programmatic import.

Update `DRAFT-PLAN.md` only after implementation gates pass. Mark Stage 1 completed with the date and actual Node evidence, keep Stage 2 not started, and leave later stage scope unchanged. Update the technology table to record Commander `15.0.0` and JSDOM `26.1.0` as a Stage 1 runtime dependency. Do not change `ARCHITECTURE.md` unless implementation evidence required a load-bearing ownership or dependency-direction change; if it did, stop, document the evidence, update the architecture authority, and add an ADR before claiming Stage 1 complete.

Run the frozen-install, typecheck, build, hygiene, full test, and compatibility gates under Node 22.20.0 and Node 24.18.0. The Compatibility Evidence output must remain 27 fixtures and 108 observations with the same two known `pie-invalid-header` noncanonical mismatches, 5/5 coordinate expectations, and 12/12 complete selected Merman fact summaries. Inspect the lockfile and direct dependency graph to confirm that Commander, Mermaid, and JSDOM are the only product runtime dependencies and that no future-stage or visual dependency appeared.

Exercise the built CLI manually with the exact commands in `Concrete Steps`. Record the final test counts, CLI transcripts, dependency layout, both runtime versions, and any implementation-time decision in this plan. Complete `Outcomes & Retrospective` and append a revision note. Stop after Stage 1 is green. Do not begin Markdown extraction or any Stage 2 work.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix for shell commands. Use pnpm for every Node package operation; do not use npm, yarn, or npx. Use patch-based edits, preserve unrelated worktree changes, and do not commit unless the user separately asks.

Establish the starting state and baseline:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch
    rtk node --version
    rtk pnpm --version
    rtk pnpm install --frozen-lockfile
    rtk pnpm check
    rtk pnpm compatibility

After the Compatibility Evidence move, rerun:

    rtk pnpm typecheck
    rtk pnpm check
    rtk pnpm compatibility
    rtk git diff -- tests/compatibility fixtures/compatibility

The last diff must show no snapshot or fixture-content change. At this checkpoint, the existing suite should still report 7 passing test files and 20 passing tests, and `pnpm compatibility` should still report 27 fixtures and 108 observations.

Add and relocate dependencies with pnpm so the lockfile records intent:

    rtk pnpm add --save-exact commander@15.0.0 jsdom@26.1.0
    rtk pnpm add --save-dev --save-exact @mermaid-lint/core@0.35.0 @mermanjs/web@0.7.0
    rtk pnpm install --frozen-lockfile
    rtk pnpm list --depth 0

Inspect `package.json` after these commands. Ensure `mermaid@11.16.0`, `jsdom@26.1.0`, and `commander@15.0.0` are exact runtime dependencies; Mermaid-lint and Merman are exact development dependencies; no duplicate key remains; and every other direct version is still exact.

During product implementation, use focused tests before the full gate:

    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/canonical-syntax tests/internal/validation
    rtk pnpm exec vitest run tests/contract/validation
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/architecture

After the CLI is built, exercise its observable behavior from the private checkout:

    rtk node dist/cli/main.js --version
    rtk node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/sequence/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/pie/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/class/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/state/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/flowchart/invalid-edge.mmd
    rtk node dist/cli/main.js tests/fixtures/cli/unsupported-gantt.mmd
    rtk node dist/cli/main.js --format json fixtures/compatibility/flowchart/invalid-edge.mmd

The five valid invocations have empty stdout/stderr and status `0`. The invalid Flowchart prints exactly one terminal syntax finding and has status `1`. The Gantt fixture prints exactly one unsupported-family finding and has status `1`. The JSON invocation prints one parseable JSON document with `schemaVersion: 1`, writes nothing to stderr, and has status `1`. The integration tests assert these statuses directly so manual shell status inspection is corroborating evidence, not the sole proof.

Exercise caller and infrastructure error classes through their tests and representative CLI commands:

    rtk node dist/cli/main.js README.md
    rtk node dist/cli/main.js missing.mmd
    rtk node dist/cli/main.js --format yaml fixtures/compatibility/flowchart/valid-minimal.mmd
    rtk pnpm exec vitest run tests/internal/canonical-syntax/worker-host.test.ts
    rtk pnpm exec vitest run tests/integration/cli/cli.test.ts

The three direct CLI input failures write a concise stderr message, no stdout result, and return `2`. The worker-host tests prove parser infrastructure Findings map to exit `3` and that a later request succeeds after timeout or crash.

Run the final gate on Node 22.20.0 by selecting its executable directory explicitly:

    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" node --version
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm install --frozen-lockfile
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm check
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm compatibility

Run the same gate on the project-pinned Node 24.18.0:

    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" node --version
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm install --frozen-lockfile
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm check
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm compatibility

Finish with repository evidence:

    rtk pnpm list --depth 0
    rtk pnpm hygiene
    rtk git diff --check
    rtk git status --short --branch

Record the final passing test counts and relevant transcripts in this plan. Expected implementation changes include the plan, product modules, Compatibility Evidence moves, tests/fixtures, package metadata and lockfile, README, DRAFT-PLAN, and JSON documentation. Any unrelated change must remain untouched and must not be described as Stage 1 work.

## Validation and Acceptance

Stage 1 is accepted only when all behavior below is observable.

The built `mermaid-validator` entry validates one explicit `.mmd` or `.mermaid` file. At least one valid fixture for Flowchart, Sequence, Pie, Class, and State exits `0` with no terminal output. Every valid fixture in the existing five-family compatibility corpus produces a module-level `ValidationResult` with `valid: true` and no Findings.

Every invalid fixture in the existing corpus returns `valid: false`, one `mermaid/syntax-error` Finding, `source: "mermaid"`, `severity: "error"`, and engine metadata naming Mermaid `11.16.0`. The CLI returns `1`. Where Mermaid supplies coordinates, the Finding has an approximate half-open span in original-document UTF-16 offsets and terminal output derives the corresponding one-based line/column. Where no coordinate exists, the finding has document precision and no fabricated span.

An officially valid Gantt diagram returns `mermaid/unsupported-diagram-type`, not a syntax error, and exits `1`. A malformed or unknown diagram header remains `mermaid/syntax-error`. No Merman or Mermaid-lint verdict can change either result.

Synthetic initialization failure, timeout, caught per-request runtime failure, crash, and malformed/mismatched IPC produce the matching stable system Finding and never escape as an uncaught exception. A caller-supplied cancellation is the only expected `AbortError` rejection. After a runtime failure, timeout, crash, current-request cancellation, or protocol failure, the next request starts a fresh worker and can successfully validate a known-valid fixture. Unique markers written by a noisy worker to raw stdout or stderr never appear in a Finding, terminal output, JSON, or parent-process stderr. Internal stderr capture retains at most 4,096 UTF-16 code units. No child or stderr-pipe handle prevents the built CLI process from exiting.

Terminal output is deterministic, compiler-style, and free of ANSI and code-frame dependencies. Valid terminal output is empty. Validation findings go to stdout. Usage and file-input errors go only to stderr and exit `2`.

JSON mode emits exactly one parseable object followed by a newline. It has integer `schemaVersion: 1`, tool name/version, document URI, valid flag, and Findings equivalent to the terminal/in-memory result. The JSON reference defines `valid` as overall validation success with no error-severity Finding and explicitly states that `valid: false` with a system Finding means validation was indeterminate or incomplete rather than proof of invalid Mermaid syntax. Optional fields are omitted when absent. No output contains raw Mermaid hashes, expected-token arrays, stack traces, JSDOM objects, temporary worker paths, or noncanonical engine values. `docs/reference/json-output-v1.md` documents the same shape and compatibility policy.

`package.json` declares only the future `mermaid-validator` executable mapping at `dist/cli/main.js`, has version `0.1.0`, retains `private: true`, has no package `exports` or `types` field, uses exact direct pins, and has no optional dependency. TypeScript declaration emission remains disabled. Stage 1 tests invoke the built entry directly and make no installed-package claim. Commander, Mermaid, and JSDOM are product runtime dependencies. Mermaid-lint and Merman are development-only Compatibility Evidence dependencies. No code-frame, Markdown, discovery, config, rule, LSP, MCP, rendering, image, geometry, layout, browser, or vision dependency is present.

The active import graph matches `ARCHITECTURE.md`: CLI imports only its subtree and `src/validation/index.ts`; product validation does not import Compatibility Evidence or delivery adapters; only the product Mermaid runtime imports Mermaid/JSDOM; and later-stage directories remain absent. Compatibility Evidence still prints 27 fixtures and 108 observations with unchanged snapshots.

`pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm compatibility` pass on Node 22.20.0 and Node 24.18.0. `README.md` describes the working Stage 1 surface, `DRAFT-PLAN.md` marks only Stage 1 complete, this plan’s living sections contain actual final evidence, and Stage 2 remains unstarted.

## Idempotence and Recovery

The source moves, pnpm operations, build, and tests are safe to repeat when performed incrementally. Use pnpm alone to change dependency placement and regenerate `pnpm-lock.yaml`. After the intended manifest update, use `pnpm install --frozen-lockfile` so registry drift cannot silently rewrite it.

The Compatibility Evidence snapshot is immutable during the directory move and should remain unchanged throughout Stage 1 because the evaluated engines, profile, fixtures, and normalization are unchanged. Do not run `compatibility:update` to repair a failure. If a product change unexpectedly alters the snapshot, inspect imports and execution paths until Compatibility Evidence is independent again. A deliberate future evidence change requires its own recorded decision and is outside this plan.

The worker host must settle every queued promise exactly once. Timer, exit, error, disconnect, abort, and message handlers all converge on one guarded completion path. Killing a failed worker and lazily starting another is the recovery path; do not silently fall back to Merman, Mermaid-lint, a browser, or Mermaid CLI. Tests must dispose injected fake hosts in `afterEach` or `afterAll` so a red test does not leave child processes behind.

If Commander `15.0.0` or the changed dependency placement fails on either verified Node runtime, record the exact install/type/runtime evidence in `Surprises & Discoveries` before changing course. Select no replacement silently. A different CLI dependency, browser fallback, new canonical engine, package split, or reversed module edge is load-bearing and requires an architecture/ADR update rather than an incidental plan edit.

Generated `dist/`, coverage, temporary worker markers, and caches may be deleted and regenerated, but do not use destructive Git commands. Test helpers that require temporary files must use an operating-system temporary directory and remove only the directory they created. Preserve unrelated user changes. Do not commit, tag, publish, or push unless the user asks.

## Artifacts and Notes

The intended valid terminal transcript is:

    $ node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
    # no stdout or stderr
    # exit status 0

The intended invalid terminal transcript is structurally:

    $ node dist/cli/main.js fixtures/compatibility/flowchart/invalid-edge.mmd
    /absolute/repository/path/fixtures/compatibility/flowchart/invalid-edge.mmd:2:6: error mermaid/syntax-error: Mermaid syntax error: <bounded Mermaid detail>
    # exit status 1

The exact approximate column remains governed by the pinned parser and the fixture-level accepted range. Tests should assert stable code, precision, and a coordinate within that accepted range rather than snapshotting volatile parser prose.

The intended unsupported-family fixture is:

    gantt
      title Unsupported but valid diagram family
      dateFormat YYYY-MM-DD
      section Example
      Task :2026-07-15, 1d

Official Mermaid must parse this source before the product reports it as unsupported. If pinned Mermaid rejects this exact fixture, replace it with the smallest officially accepted non-target-family fixture, record the probe and replacement here, and preserve the distinction between accepted-but-unsupported and malformed syntax.

The final dependency shape should resemble:

    dependencies:
      commander 15.0.0
      jsdom 26.1.0
      mermaid 11.16.0
    devDependencies:
      @mermaid-lint/core 0.35.0
      @mermanjs/web 0.7.0
      @types/jsdom 21.1.7
      @types/node 24.13.3
      typescript 7.0.2
      vitest 4.1.10

    $ pnpm check
    Repository hygiene: clean across tracked and untracked files
    Test Files  15 passed (15)
    Tests       67 passed (67)

    $ pnpm compatibility
    Compatibility summary: 27 fixtures, 108 observations
    Verdict mismatches: mermaid-lint-official 0; mermaid-lint-aggregate 1 [pie-invalid-header]; merman 1 [pie-invalid-header]
    Official diagnostics: approximate locations 9/15; document-only 6/15; coordinate expectations 5/5
    Merman facts: complete 12/12; partial 0; unavailable 0

## Interfaces and Dependencies

In `src/validation/document.ts`, define:

    export interface DocumentSnapshot {
      readonly uri: string;
      readonly languageId: "mermaid";
      readonly text: string;
      readonly version?: number;
    }

    export interface ValidateOptions {
      readonly mode?: "canonical";
      readonly signal?: AbortSignal;
    }

In `src/validation/findings.ts`, define at least:

    export type LocationPrecision = "exact" | "approximate" | "document";

    export type BuiltInFindingCode =
      | "mermaid/syntax-error"
      | "mermaid/unsupported-diagram-type"
      | "system/parser-initialization-failed"
      | "system/parser-timeout"
      | "system/parser-runtime-failed"
      | "system/parser-crashed"
      | "system/parser-protocol-error";

    export interface TextSpan {
      readonly startOffset: number;
      readonly endOffset: number;
    }

    export interface Finding {
      readonly code: string;
      readonly severity: "error" | "warning" | "info";
      readonly message: string;
      readonly source: "mermaid" | "rule" | "system";
      readonly span?: TextSpan;
      readonly locationPrecision: LocationPrecision;
      readonly diagramType?: string;
      readonly engine?: {
        readonly name: "mermaid";
        readonly version: string;
      };
      readonly help?: string;
    }

    export interface ValidationResult {
      readonly documentUri: string;
      readonly documentVersion?: number;
      readonly valid: boolean;
      readonly findings: readonly Finding[];
    }

Stage 1 produces only `BuiltInFindingCode` values, only `severity: "error"`, and never produces `source: "rule"`. Internal Stage 1 mappings must type their code values as `BuiltInFindingCode` so project-owned misspellings fail typechecking, but `Finding.code` remains an open string so later external plugins do not need to edit a closed union. The built-in codes follow the `<namespace>/<name>` convention. Stage 3 will validate that convention when external rules can register; do not add registration, fixes, related locations, Semantic Facts, or raw payload fields before their stages activate.

In `src/validation/validate-document.ts`, implement the module behavior equivalent to:

    export async function validateDocument(
      document: DocumentSnapshot,
      options: ValidateOptions = {},
    ): Promise<ValidationResult>;

The implementation must not mutate the snapshot. `mode` defaults to canonical. It throws only when `options.signal` cancels the call; all official parser and worker failures become stable Findings.

In `src/validation/canonical-syntax/protocol.ts`, define a project-owned internal union equivalent to:

    export type SyntaxOutcome =
      | {
          kind: "accepted";
          diagramType: TargetDiagramType;
          engineVersion: string;
        }
      | {
          kind: "syntax-error";
          message: string;
          diagramType?: string;
          location?: { line?: number; column?: number };
          locationPrecision: "approximate" | "document";
          engineVersion: string;
        }
      | {
          kind: "unsupported-type";
          diagramType: string;
          message: string;
          engineVersion: string;
        }
      | {
          kind: "engine-failure";
          failure: "initialization" | "timeout" | "runtime" | "crash" | "protocol";
          message: string;
          debugDetail?: string;
        };

`debugDetail` is Canonical Syntax implementation evidence only. It may contain the bounded stderr tail captured by `worker-host.ts`, must never be sent by `worker-entry.ts` over IPC, and must be dropped when Diagram Validation maps the Syntax Outcome into a Finding.

Define `TargetDiagramType` locally in the Canonical Syntax module or in a private root validation file as `"flowchart" | "sequence" | "pie" | "class" | "state"`. Do not import the identically shaped Compatibility Evidence type. Keep the raw alias table private to `mermaid-runtime.ts` and equivalent to:

    const TARGET_TYPE_ALIASES = {
      graph: "flowchart",
      flowchart: "flowchart",
      "flowchart-v2": "flowchart",
      sequence: "sequence",
      sequenceDiagram: "sequence",
      pie: "pie",
      class: "class",
      classDiagram: "class",
      state: "state",
      stateDiagram: "state",
      "stateDiagram-v2": "state",
    } as const satisfies Readonly<Record<string, TargetDiagramType>>;

The internal Canonical Syntax operation is equivalent to:

    export async function checkCanonicalSyntax(
      source: string,
      options?: { signal?: AbortSignal },
    ): Promise<SyntaxOutcome>;

No delivery adapter may import this function. `src/validation/validate-document.ts` reaches it through `src/validation/canonical-syntax/index.ts`.

In `src/cli/json-v1-output.ts`, own delivery-only JSON projection types. They may structurally mirror module-interface Findings but must not modify or broaden the Diagram Validation contract. Export a formatter equivalent to:

    export function formatJsonV1(
      result: ValidationResult,
      toolVersion: string,
    ): string;

In `src/cli/terminal-output.ts`, export a formatter equivalent to:

    export function formatTerminal(
      result: ValidationResult,
      sourceText: string,
    ): string;

In `src/cli/main.ts`, keep process and filesystem effects at the edge. The testable seam is equivalent to:

    export interface CliDependencies {
      readonly validate: typeof validateDocument;
      readonly readFile: typeof import("node:fs/promises").readFile;
      readonly stdout: Pick<NodeJS.WriteStream, "write">;
      readonly stderr: Pick<NodeJS.WriteStream, "write">;
    }

    export async function runCli(
      argv: readonly string[],
      dependencies?: Partial<CliDependencies>,
    ): Promise<0 | 1 | 2 | 3>;

The only new external runtime dependency is exact-pinned `commander@15.0.0`. Exact-pinned `jsdom@26.1.0` changes placement from development to runtime because the product imports it. Exact-pinned Mermaid `11.16.0` remains the canonical runtime. Mermaid-lint `0.35.0` and Merman `0.7.0` remain installed only for Compatibility Evidence and move to development dependencies. Do not add any other dependency during this plan without recording new implementation evidence and confirming it remains inside Stage 1.

## Revision Note

2026-07-15 / Codex: Created the initial self-contained Stage 1 ExecPlan. It incorporates the completed and hardened Stage 0 evidence, the accepted DDD-lite module boundaries, the exact official Mermaid/JSDOM profile, a test-preserving move to `src/compatibility/`, a serialized restartable product worker, one-file CLI and exit-code contracts, version-1 JSON output, exact Commander runtime placement, and explicit Node 22/24 closure gates. No Stage 1 implementation, dependency change, commit, tag, or publication was performed while authoring the plan.

2026-07-16 / User and Codex: Revised the Finding module contract after design review. `Finding.code` is now an open string for future namespaced plugin codes, while `BuiltInFindingCode` remains the strongly typed Stage 1 producer contract. This resolves the conflict with the accepted Stage 3 requirement that external-style fixture plugins must not edit a closed internal union.

2026-07-16 / User and Codex: Defined `ValidationResult.valid` as overall validation success with no error-severity Findings. System errors take CLI exit-code precedence `3`, other error Findings—including future rule errors—map to `1`, warning-only results remain successful, and Finding codes retain the distinction between invalid input and incomplete validation.

2026-07-16 / User and Codex: Added `system/parser-runtime-failed` for an unexpected per-request exception caught inside an initialized worker. This outcome is distinct from syntax rejection, process crash, and protocol failure; the host returns the matching system Finding, discards the affected worker, and proves recovery on a later request.

2026-07-16 / User and Codex: Reclassified `src/validation/index.ts` as a repository-internal module seam rather than an npm programmatic interface and generalized the policy through Stage 5. Early stages keep the package private, declaration emission disabled, and package exports absent; Stage 6 owns the decision to expose and support mature programmatic contracts.

2026-07-16 / User and Codex: Isolated raw worker output from product output. The worker now uses ignored stdin/stdout, piped stderr, and IPC; the host drains and bounds stderr as internal `debugDetail`, while Diagram Validation must discard that detail before producing Findings. No raw worker marker may reach terminal, JSON, or parent stderr, and Stage 1 exposes no debug mode.

2026-07-16 / User and Codex: Closed the evidence-determined review branches. Canonical Syntax now owns the exact proven Mermaid raw-type aliases inside `mermaid-runtime.ts`; the focused import-boundary test uses the existing TypeScript compiler AST and module resolver; and Stage 1 verifies the private CLI through `node dist/cli/main.js` while Stage 6 retains clean-install and real package-bin acceptance.

2026-07-16 / Codex: Implemented and closed Stage 1. Compatibility Evidence moved unchanged, the validation and isolated canonical-worker modules landed, the one-file terminal/JSON CLI and documentation landed, direct runtime dependencies were reduced to Commander/JSDOM/Mermaid, and the initial 65-test plus compatibility gates passed on Node 22.20.0 and Node 24.18.0. No Stage 2, visual, package-publication, commit, tag, or push work was performed.

2026-07-16 / Codex: Fixed the high-priority startup-cancellation lifecycle defect found during post-implementation review. A delayed-ready worker regression proves that aborting the sole queued request discards the initializing child and that the next request starts a fresh worker. The updated 66-test full gate and unchanged compatibility gate pass on Node 22.20.0 and Node 24.18.0.

2026-07-16 / User and Codex: Closed the post-review exact-IPC-validation finding as intentionally deferred. Stage 1 retains its current structural worker-message guard; stricter closed-shape validation requires a real trust boundary, version-skew case, or observed malformed-field defect.

2026-07-16 / User and Codex: Closed exhaustive per-alias test coverage as intentionally deferred. Stage 1 proves the raw spellings emitted by the pinned official runtime on its target corpus and retains the remaining Stage 0-proven aliases defensively without adding a synthetic test seam.

2026-07-16 / User and Codex: Closed the final post-review finding by extending the active Stage 1 import-boundary assertion to every Diagram Validation file and keeping Canonical Syntax project imports inside its subtree. The generalized future import-graph checker remains deferred. The updated 67-test full gate and unchanged compatibility gate pass on Node 22.20.0 and Node 24.18.0.
