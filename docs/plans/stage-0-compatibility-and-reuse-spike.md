# Prove the Stage 0 validation foundation and reuse boundary

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at the repository root. It implements only Stage 0, “Compatibility and reuse spike,” from `DRAFT-PLAN.md`. It must not implement the Stage 1 product CLI, Markdown extraction, public custom rules, LSP, rendering, geometry analysis, or model-based visual review.

## Purpose / Big Picture

After this work, a contributor can run one compatibility command and see whether the exact-pinned official Mermaid parser, `@mermaid-lint/core`, and Merman agree on a repository-owned corpus covering Flowchart, Sequence, Pie, Class, and State diagrams. Invalid Mermaid must be reported as invalid input, while an engine initialization failure or child-process crash must be reported as an engine failure rather than escaping as an uncaught exception. The checked-in snapshots and ADR will show what location and semantic-fact information each engine actually provides.

This is a foundation proof, not yet an end-user validator. Its observable result is a green TypeScript/Vitest harness, a reproducible compatibility matrix, and `docs/adr/0001-validation-foundation.md`, which records the exact supported Mermaid profile and whether selected upstream behavior can be wrapped unchanged. A contributor demonstrates the result with `pnpm compatibility` and `pnpm check` from the repository root.

## Progress

- [x] (2026-07-13 18:42Z) Authored this Stage 0 ExecPlan after reading `AGENTS.md`, all of `DRAFT-PLAN.md`, all of `PLANS.md`, the empty repository state, the current public package surfaces, and the permitted real-world Mermaid examples.
- [x] (2026-07-13 19:01Z) Bootstrapped the private TypeScript/ESM package, exact-pinned dependency set and lockfile, strict build/typecheck setup, Vitest harness, and frozen-install Node 22/24 development CI matrix.
- [x] (2026-07-13 19:06Z) Defined project-owned compatibility contracts and isolated adapters for direct official Mermaid, both relevant `@mermaid-lint/core` paths, and Merman validation/selected facts.
- [x] (2026-07-13 19:09Z) Added 27 self-contained fixtures: 12 valid and 15 invalid diagrams across all five families, including the two repository-local real-world copies.
- [x] (2026-07-13 19:11Z) Produced and reran the 108-observation normalized compatibility snapshot plus process-failure tests; all 9 focused compatibility tests pass.
- [x] (2026-07-13 19:12Z) Wrote ADR 0001, resolved only the Stage 0 facts in `DRAFT-PLAN.md`, and updated `README.md` without adding Stage 1 product behavior.
- [x] (2026-07-13 19:13Z) Completed the frozen-install acceptance gate on Node 22.20.0: 11 full-suite tests and 9 focused compatibility tests pass; dependency, whitespace, snapshot, and worktree checks are clean for the files in scope.
- [x] (2026-07-13 19:43Z) Reopened Stage 0 after review found incomplete composite-State extraction, lossy structured diagnostic messages, location-presence checks that did not prove coordinate correctness, non-observable compatibility output, and hygiene evidence that excluded untracked files. Stage 1 remained unstarted throughout the hardening pass.
- [x] (2026-07-13 19:56Z) Completed red-green regression cycles for recursive State facts, structured error messages, representative coordinate spans, compact compatibility reporting, centralized engine versions, worker observation shape, timeout and initialization-error paths, and tracked-plus-untracked hygiene.
- [x] (2026-07-13 20:00Z) Inspected the expected snapshot failures, recorded the reason, refreshed both evidence snapshots, and completed the final Node 22 gate: frozen install succeeded, 7 files / 20 tests passed in `pnpm check`, 4 files / 16 tests passed in the non-update `pnpm compatibility` rerun, and repository hygiene was clean. Node 24 is recorded as a hard prerequisite before Stage 1 because it is not installed locally and no remote exists.
- [x] (2026-07-13 20:13Z) Installed Node 24.18.0 with nvm, added the exact project-local `.nvmrc`, restored the global nvm default to Node 22.20.0, and passed the frozen install, 7-file / 20-test full check, and 4-file / 16-test compatibility gate on Node 24.18.0. The former Stage 1 prerequisite is satisfied.

## Surprises & Discoveries

- Observation: The repository has no commits and no implementation package yet; the existing root files are untracked user files.
  Evidence: At plan-authoring time, `git status --short` listed `.gitignore`, `AGENTS.md`, `DRAFT-PLAN.md`, `PLANS.md`, and `README.md` as untracked, and `git log` reported that `main` had no commits. Implementation must preserve these files and must not commit unless the user later asks.

- Observation: `@mermaid-lint/core@0.35.0` exposes two materially different validation paths.
  Evidence: Its public `validateWithMermaidJS()` helper always calls official Mermaid, but `validateBlock()` first accepts a successful Merman result and then skips official Mermaid. The aggregate path therefore cannot be assumed canonical merely because its fallback calls Mermaid.

- Observation: The same upstream package already depends on Mermaid, JSDOM, and Merman using ranges, even though this project requires an exact evaluated profile.
  Evidence: The published `@mermaid-lint/core@0.35.0` manifest declares `mermaid: ^11.8.1`, `jsdom: ^26.1.0`, and `@mermanjs/web: ^0.7.0`. This project must direct-pin the evaluated packages and commit `pnpm-lock.yaml`; a lockfile alone does not make the intent visible.

- Observation: Stable `@mermanjs/web@0.7.0` has validation and parse-object APIs for all five target families, but the raw parse object is too large and version-specific to expose or snapshot directly.
  Evidence: A local probe returned useful nodes/edges, participants/messages, pie sections, classes/relations, and states/relations. The State result also contained a large Mermaid configuration object. The spike must snapshot a small project-owned fact summary instead of the raw object.

- Observation: The permitted `modern-agent/wiki` corpus supplies real-world Flowchart and State examples but not all five target families.
  Evidence: The Markdown files inspected at authoring time contained Flowchart and `stateDiagram-v2` blocks. Those two examples can seed repository-local fixtures, while Sequence, Pie, and Class fixtures must be authored specifically for this corpus.

- Observation: The local authoring runtime is Node `v22.20.0`, while `DRAFT-PLAN.md` selects Node 24 LTS as the primary runtime and asks to test Node 22 when dependency ranges permit.
  Evidence: `node --version` returned `v22.20.0`; current Vitest supports Node 22 and 24. The plan therefore keeps Node 22 as a tested compatibility target and uses CI to exercise both Node 22 and Node 24.

- Observation: Mermaid accepts whitespace around a simple Sequence arrow, so `Alice -> Bob: Hello` was not an invalid fixture.
  Evidence: The first corpus run reported `sequence-invalid-message` as accepted. Replacing it with the missing-target form `Alice->>: Hello` produced the intended official parse rejection, and the updated corpus passed.

- Observation: Merman and the aggregate mermaid-lint path both accept the invalid `pieChart` header that official Mermaid and the mermaid-lint official helper reject.
  Evidence: The final matrix records 12 accepted and 15 rejected direct-official observations, but 13 accepted and 14 rejected observations for both Merman and `mermaid-lint-aggregate`. Their sole verdict mismatch is `pie-invalid-header`.

- Observation: The initial Merman selector falsely reported incomplete composite-State facts because it read only top-level collections.
  Evidence: The initial run produced 11 `complete-for-fixture` observations and one `partial` result. The hardening probe found the missing `Working`, `Waiting`, and internal relations under `parsed.states.Active.doc`; recursive extraction corrected the result to 12 of 12 without changing dependencies or the project-owned facts contract.

- Observation: Structured location availability is engine- and grammar-dependent rather than universal.
  Evidence: Direct Mermaid and the mermaid-lint official helper supplied a line or column for 9 of 15 invalid fixtures. Merman supplied no structured locations for its 14 rejections. The adapters retain document precision instead of fabricating ranges.

- Observation: Mermaid parser errors expose inconsistent line fields, and the previously normalized field was not the best source coordinate.
  Evidence: Representative raw probes exposed both `hash.line` and `hash.loc.first_line`. For example, the three-line Class block reported `hash.line: 4` but `hash.loc.first_line: 3`, while the two-line State transition reported `hash.line: 3` but `hash.loc.first_line: 2`. The hardened adapter prefers `hash.loc.first_line`, retains `approximate` precision, and proves five fixture-level expectations including one document-only Pie diagnostic.

- Observation: The earlier composite-State limitation was caused by the local selector, not by missing upstream facts.
  Evidence: `parsed.states.Active.doc` contains `Working`, `Waiting`, and their internal relations. Recursive State-document extraction now makes all 12 valid fixtures `complete-for-fixture`; the optional Merman boundary remains because it is still an independent syntax implementation.

- Observation: Generated JavaScript beside TypeScript changed which implementation Vitest exercised.
  Evidence: The structured-message regression stayed red after the TypeScript fix until stale `src/**/*.js` and source maps were removed. Builds already emit to ignored `dist/`, and the new hygiene command checks tracked and untracked files for both generated source artifacts and trailing whitespace.

## Decision Log

- Decision: Keep this plan strictly within Stage 0 and produce a development spike rather than a user-facing CLI.
  Rationale: The project instructions require the active stage to satisfy its exit criteria before later work starts. A compatibility command is evidence for Stage 0; accepting user file arguments and formatting product diagnostics belong to Stage 1.
  Date/Author: 2026-07-14 / Codex

- Decision: Use a project-owned direct official-Mermaid adapter as the canonical comparison path, and observe the `@mermaid-lint/core` official helper and aggregate validator as two separate upstream paths.
  Rationale: Official Mermaid must decide syntax. Separating the upstream paths makes the Merman fast-path behavior visible and prevents an aggregate success from being mislabeled as proof that official Mermaid ran.
  Date/Author: 2026-07-14 / Codex

- Decision: Run each engine path in its own Node child process and exchange JSON over standard input/output.
  Rationale: Mermaid and JSDOM mutate process globals, while Merman initializes a WASM singleton. Process isolation makes engine observations independent, turns exits and malformed output into observable engine failures, and avoids making Stage 0 implement the long-lived worker lifecycle reserved for Stage 1.
  Date/Author: 2026-07-14 / Codex

- Decision: Start from the exact candidate profile Mermaid `11.16.0`, `@mermaid-lint/core` `0.35.0`, `@mermanjs/web` `0.7.0`, JSDOM `26.1.0`, TypeScript `7.0.2`, Vitest `4.1.10`, `@types/node` `24.13.3`, and `@types/jsdom` `21.1.7`, using pnpm `10.30.1`.
  Rationale: These were the current stable public releases or the JSDOM/type versions used by the evaluated upstream foundation at plan-authoring time. Exact pins and the lockfile make the spike reproducible. If any candidate cannot install or typecheck on the declared Node matrix, the executor must choose the nearest compatible stable release, record the evidence and replacement here and in ADR 0001, and regenerate the lockfile; silently using a range is not allowed.
  Date/Author: 2026-07-14 / Codex

- Decision: Use `mermaid-diagram-validator` as the planned public package name, but keep `private: true` during Stage 0.
  Rationale: The name matches the repository and returned npm registry E404 at plan-authoring time. Registry absence is not a reservation, so ADR 0001 must record the check date and the name must be rechecked before the first publication. `private: true` prevents an accidental spike release.
  Date/Author: 2026-07-14 / Codex

- Decision: Default to wrapping selected public upstream exports without a fork; require Stage 0 evidence before changing that default.
  Rationale: The official helper is already public, while the aggregate validator's fast path and closed rule registry do not need to become this project's canonical core. A contribution is justified only for a small generally useful missing public seam; a narrow fork is the last resort when a necessary fix cannot be accepted upstream in time.
  Date/Author: 2026-07-14 / Codex

- Decision: Copy any external wiki-derived diagrams into repository-local `.mmd` fixtures and never make tests read `~/Documents/playground/modern-agent`.
  Rationale: CI and a future stateless contributor have only this repository. The original paths are provenance, not runtime dependencies. Exact seed contents are included later in this plan so implementation remains self-contained.
  Date/Author: 2026-07-14 / Codex

- Decision: Keep the direct official adapter as canonical even though `validateWithMermaidJS()` matched all 27 official verdicts.
  Rationale: The upstream helper owns a different loose-security initialization profile, while this project must record and control its strict compatibility profile. The aggregate path's observed false acceptance also proves that the package name alone is not enough to establish that official Mermaid ran.
  Date/Author: 2026-07-14 / Codex

- Decision: Intentionally refresh the two compatibility snapshots after repairing the permissive Sequence fixture and aligning selected fact expectations with the project-owned normalized IDs.
Rationale: The preceding failed run and snapshot inspection showed that these were deliberate fixture/normalization corrections, not a blind repair. The immediate non-update `pnpm compatibility` rerun passed with no further snapshot change.
Date/Author: 2026-07-14 / Codex

- Decision: Intentionally refresh the two compatibility snapshots after the Stage 0 hardening behavior was independently proven.
  Rationale: The required non-update run failed only on the inspected evidence changes: structured mermaid-lint messages replaced `[object Object]`, official locations switched from inconsistent `hash.line` values to `hash.loc.first_line`, composite-State facts became complete, and its obsolete `missing-fact` discrepancy disappeared. These are the reviewed regression fixes, not an unexplained dependency or fixture drift.
  Date/Author: 2026-07-14 / Codex

## Outcomes & Retrospective

Stage 0 is complete again after evidence hardening. The exact dependency profile is unchanged, and the 27-fixture corpus still produces 108 normalized observations. Official Mermaid and the mermaid-lint official helper match all canonical expectations; the aggregate mermaid-lint and Merman paths each retain the one visible `pie-invalid-header` false acceptance.

Composite-State facts now recurse through Merman State documents, so all 12 valid fixture summaries are `complete-for-fixture`. Structured mermaid-lint messages remain meaningful. Official diagnostic availability is still 9 of 15, now explicitly separated from correctness evidence: five representative fixture expectations pass, with four approximate coordinate spans and one document-only diagnostic. `pnpm compatibility` prints these counts from the same matrix used by tests and snapshots.

The final gates pass on both Node 22.20.0 and Node 24.18.0: frozen install succeeds; `pnpm check` passes 7 files and 20 tests; the immediate non-update `pnpm compatibility` rerun passes 4 files and 16 tests; and the tracked-plus-untracked hygiene check finds no whitespace or generated-source artifacts. `.nvmrc` selects Node 24.18.0 within this project, while the nvm default remains Node 22.20.0. The product CLI, long-lived parser worker, Markdown extraction, public rule engine, LSP, MCP, and all visual work remain deliberately unimplemented.

## Context and Orientation

This is a new repository. `DRAFT-PLAN.md` is the accepted staged architecture. Its invariant is that official Mermaid supplies the canonical syntax verdict: “canonical” means the success or failure that the validator will ultimately report as Mermaid syntax truth. `AGENTS.md` prohibits visual dependencies and later-stage implementation during this work. `README.md` currently says the project is still in planning. `.gitignore` already excludes `node_modules/`, `dist/`, `coverage/`, caches, logs, and generated validator state.

An adapter is a small project-owned module that translates a third-party API into this repository's types. Adapters matter here because Mermaid, `@mermaid-lint/core`, and Merman expose different verdicts, type names, locations, and error objects. No upstream AST or raw error object should become a public project contract during this spike.

A fixture is one `.mmd` file containing a single diagram. The compatibility corpus is the complete collection of those files plus a TypeScript manifest that declares each fixture's target family and expected official-Mermaid outcome. “Facts” are structural observations used by later semantic rules, such as Flowchart nodes and edges or Sequence participants and messages. Stage 0 only measures whether Merman can provide selected facts; it does not add semantic rules.

Use these four engine-path identifiers throughout the spike:

- `official-mermaid` directly imports exact-pinned `mermaid`, creates JSDOM before that import, initializes a recorded strict parse profile, calls `detectType()` when possible, and awaits `parse()` with errors enabled.
- `mermaid-lint-official` calls the public `validateWithMermaidJS()` export from exact-pinned `@mermaid-lint/core`.
- `mermaid-lint-aggregate` creates an upstream `Block` and calls the public `validateBlock()` export. This measures the Merman-first path but never defines canonical truth.
- `merman` initializes exact-pinned `@mermanjs/web` from its packaged WASM bytes, calls `validate()`, and calls `parseObject()` only for accepted fixtures to derive a small fact summary. Do not call `renderSvg`, `renderAscii`, `layoutJson`, or any visual API.

The direct official profile begins as `startOnLoad: false`, `securityLevel: "strict"`, and `suppressErrorRendering: true`. Record this object verbatim in ADR 0001. If a setting proves unsupported in the pinned Mermaid types or changes parse behavior unexpectedly, record the observation and use the smallest profile that keeps parsing deterministic and non-rendering.

Create only the Stage 0 portions of the future tree:

    package.json
    pnpm-lock.yaml
    tsconfig.json
    vitest.config.ts
    .github/workflows/ci.yml
    src/adapters/official-mermaid.ts
    src/adapters/mermaid-lint.ts
    src/adapters/merman.ts
    src/spike/contracts.ts
    src/spike/normalize.ts
    src/spike/worker.ts
    src/spike/run-isolated.ts
    fixtures/compatibility/manifest.ts
    fixtures/compatibility/flowchart/*.mmd
    fixtures/compatibility/sequence/*.mmd
    fixtures/compatibility/pie/*.mmd
    fixtures/compatibility/class/*.mmd
    fixtures/compatibility/state/*.mmd
    tests/compatibility/corpus.test.ts
    tests/compatibility/isolation.test.ts
    tests/architecture/no-visual-dependencies.test.ts
    tests/fixtures/workers/exit-nonzero.mjs
    tests/fixtures/workers/malformed-output.mjs
    docs/adr/0001-validation-foundation.md

Do not create the future `src/cli`, `src/lsp`, `src/extraction`, `src/rules`, `src/reporters`, `src/render`, `src/geometry`, or `src/vision` directories.

## Plan of Work

### Milestone 1: Establish a reproducible non-visual package and test harness

Create `package.json` as a private ESM package named `mermaid-diagram-validator`. Set `packageManager` to `pnpm@10.30.1`, set the Node engine to `^22.13.0 || >=24.0.0`, and provide `build`, `typecheck`, `test`, `compatibility`, `compatibility:update`, and `check` scripts. `build` compiles `src/` into ignored `dist/`; `typecheck` checks source and tests without emitting; `test` runs all Vitest suites; `compatibility` builds the child-process worker and then runs the corpus suite; `compatibility:update` intentionally refreshes compatibility snapshots; `check` runs typechecking and all tests. Ensure the test and compatibility lifecycle scripts build the worker before Vitest starts.

Put exact-pinned `mermaid`, `@mermaid-lint/core`, and `@mermanjs/web` in `dependencies`. Put exact-pinned `jsdom`, TypeScript, Vitest, `@types/node`, and `@types/jsdom` in `devDependencies`. JSDOM is a development dependency in Stage 0 because the deliverable is a spike; Stage 1 will decide its product-runtime placement. Do not use caret, tilde, `latest`, workspace wildcard, or optional dependency specifiers for these evaluated packages.

Configure TypeScript for strict ESM using `module` and `moduleResolution` set to `NodeNext`, UTF-8 source, declaration-free Stage 0 output, and separate handling so `src/` builds while source and tests both typecheck. Configure Vitest for the Node environment, deterministic snapshots, and no implicit browser environment. Add a small internal CI workflow using pnpm, frozen lockfile installation, and a Node 22/24 matrix. This workflow is development verification, not the GitHub Action product integration deferred to Stage 6.

Run `pnpm install` once to create `pnpm-lock.yaml`, then use `pnpm install --frozen-lockfile` for every reproducibility check. Inspect `pnpm list --depth 0` and `pnpm why` for all three evaluated engines. Record any extra installed copy that changes which Mermaid or Merman code an adapter actually imports.

At this milestone's end, `pnpm typecheck` and an empty/smoke Vitest suite run successfully on the local Node 22 runtime, the lockfile exists, and package metadata contains no visual dependency.

### Milestone 2: Build isolated, project-owned engine observations

In `src/spike/contracts.ts`, define the target diagram families, fixture shape, engine identifiers, observation verdict, location precision, selected fact summaries, and adapter interface. The names and minimum fields are specified in `Interfaces and Dependencies` below. Keep every returned object JSON-serializable.

In `src/spike/normalize.ts`, implement type normalization and error normalization. Preserve an engine's raw type label in `rawDiagramType`, but normalize known labels such as `graph`, `flowchart-v2`, and `flowchart` to `flowchart`; `sequenceDiagram` and `sequence` to `sequence`; `classDiagram` and `class` to `class`; `stateDiagram`, `stateDiagram-v2`, and `state` to `state`; and `pie` to `pie`. Normalize errors into the small families `parse-error`, `unsupported-type`, `initialization-error`, `engine-crash`, and `unknown-engine-error`. Preserve only a concise first-line message and structured line/column data. Do not snapshot stacks, absolute temporary paths, entire parser tokens, or raw Merman parse objects.

Implement each upstream boundary in `src/adapters/`. The official adapter must construct JSDOM globals before dynamically importing Mermaid. The Mermaid-lint adapter must expose two entry points, one for its official helper and one for its aggregate validator, and label the results separately. The Merman adapter must locate `@mermanjs/web/pkg/merman_wasm_bg.wasm` with `createRequire(import.meta.url)`, read it with `node:fs/promises`, initialize once inside its child process, and translate Merman status codes. `MERMAN_NO_DIAGRAM` and `MERMAN_UNSUPPORTED_FORMAT` are `unsupported`; parse errors are `rejected`; panic/internal/init failures are `engine-error` observations.

For accepted Merman parses, adapt only these selected facts: Flowchart node IDs and edge endpoint pairs; Sequence participant IDs and message endpoint pairs; Pie section labels and numeric values; Class IDs, member counts, and relation endpoint pairs; State IDs and transition endpoint pairs. Sort unordered data before returning it. Include a `completeness` value of `complete-for-fixture`, `partial`, or `unavailable`. The adapter may claim `complete-for-fixture` only when the result matches explicit expectations in that fixture's manifest entry. It must never claim completeness for all Mermaid syntax based on this corpus.

In `src/spike/worker.ts`, accept one JSON request on standard input containing an engine identifier and all fixture sources, dynamically import only the requested adapter, evaluate serially, and emit one JSON response on standard output. Catch ordinary adapter exceptions and emit `engine-error`. In `src/spike/run-isolated.ts`, start the compiled worker with `process.execPath`, pass the request, capture standard error as evidence, apply a bounded process timeout, and turn nonzero exit, signal, timeout, or malformed JSON into `engine-error` rather than throwing. A failed engine must not prevent other engines from being evaluated.

Use `tests/fixtures/workers/exit-nonzero.mjs` and `malformed-output.mjs` only to prove the process wrapper. `tests/compatibility/isolation.test.ts` must demonstrate that both failures return structured engine-failure observations and do not reject the test promise unexpectedly.

At this milestone's end, a smoke diagram can be evaluated through all four isolated paths, and a deliberately broken worker is visibly different from rejected Mermaid input.

### Milestone 3: Curate the five-family compatibility corpus

Create `fixtures/compatibility/manifest.ts` as the single catalog. Each entry contains `id`, repository-relative `path`, `diagramType`, `expectedCanonicalVerdict`, `tags`, optional `expectedLocation`, and optional `expectedFacts`. The manifest loader must fail clearly on a missing file, duplicate ID, mismatched directory/type, or an empty source.

For every target family, add at least two valid fixtures and at least three invalid fixtures. One valid fixture is a minimal baseline. The other exercises syntax that current editors or documents plausibly emit. Use modern shape syntax for Flowchart, create/destroy or grouping syntax for Sequence, `showData` plus a title for Pie, generic/member/relation syntax for Class, and `stateDiagram-v2` with a composite or labeled transition for State. The three invalid cases should cover different error shapes rather than three variants of a missing final character: use an invalid header or declaration, a malformed relationship/message/section, and an unterminated label or block where that family supports one.

Do not trust a fixture filename to establish validity. Run it through the official adapter. If a supposedly invalid fixture is accepted because Mermaid is permissive, repair the fixture and note the surprising acceptance in this plan. All valid fixtures must have explicit selected-fact expectations where the family supports them. At least one invalid fixture per family should be intended to exercise location reporting; the test records when the pinned official parser cannot supply a line or column rather than inventing one.

Add the two real-world fixtures included under `Artifacts and Notes` as additional valid Flowchart and State cases. Record their original wiki path and line in manifest comments, but copy the source into this repository. Tests must continue to work if the external `modern-agent` checkout is moved or deleted. This yields a minimum corpus of 27 fixtures: 25 required family fixtures plus two real-world additions.

At this milestone's end, manifest tests report at least two valid and three invalid fixtures for each family, every file is self-contained, and the permitted external wiki is not read by any test.

### Milestone 4: Compare engines and decide the foundation

In `tests/compatibility/corpus.test.ts`, load the manifest once, send the complete corpus through each isolated engine path, and join results by fixture ID. Assert that every valid fixture is accepted by `official-mermaid`, every invalid fixture is rejected rather than causing `engine-error`, and every rejection has a nonempty diagnostic message. Assert that the number of observations is exactly the number of fixtures multiplied by four engine paths.

Snapshot the normalized matrix, including engine/package version, raw and normalized type, verdict, error family, available line/column, location precision, and selected fact summary. The snapshot must make disagreements visible but must not fail merely because a noncanonical engine disagrees with canonical Mermaid. Add focused assertions that classify each disagreement as a false acceptance, false rejection, unsupported feature, missing location, missing fact, or engine failure. Official Mermaid remains the expected verdict even if both other engines agree with each other.

Write `docs/adr/0001-validation-foundation.md` after observing the matrix. The ADR must include status, date, context, exact direct dependencies and effective transitive resolutions, Node versions, the direct official config profile, corpus counts, a concise per-family result, error/location coverage, Merman fact completeness, and the final reuse decision. It must explicitly answer all five Stage 0 open decisions from `DRAFT-PLAN.md`:

1. State which `@mermaid-lint/core` public exports may be wrapped, which must not define canonical mode, whether an upstream contribution is useful, and whether a fork is needed.
2. Name the exact Mermaid version and initialization profile that define default compatibility.
3. State whether JSDOM-only official parsing passed the complete corpus without engine failure.
4. State which selected Merman facts were complete for the tested fixtures in each family and where coverage was partial or unavailable.
5. Record `mermaid-diagram-validator` as the planned package name, the registry check date, and the requirement to recheck before publishing.

Choose the upstream strategy with this rubric. Wrap unchanged when a public export can satisfy the local adapter contract. Propose a focused upstream contribution when a small, generally useful seam is missing but the project can proceed with a local wrapper. Use a narrow fork only when a required correctness fix cannot be expressed outside the package and waiting for upstream would block Stage 1. Never fork merely to rename types or avoid writing an adapter.

Update `DRAFT-PLAN.md` only where Stage 0 has resolved previously open facts: exact evaluated versions, the supported profile, JSDOM result, upstream boundary, selected Merman fact coverage, package name, and Stage 0 status. Preserve the accepted later-stage scope and do not add Stage 1 implementation. Update `README.md` only enough to point readers to the completed Stage 0 evidence and say that the product CLI is still not implemented.

At this milestone's end, a reader can start with ADR 0001 and understand the foundation decision without reading test internals or this conversation.

### Milestone 5: Close Stage 0 with reproducible evidence

Run the full acceptance sequence from a clean installation using the frozen lockfile. Confirm Node 22 locally, then use `nvm use` with the repository `.nvmrc` to confirm Node 24 locally. Keep the Node 22/24 CI matrix ready; if CI is not runnable because the repository has no remote yet, record the missing hosted execution honestly without weakening the two local runtime gates.

Inspect `package.json` and the direct dependency graph for forbidden visual packages. The Merman package is permitted only for validation and selected parse facts under the accepted Stage 0 design; do not exercise or document its rendering APIs as product capabilities. Confirm that no Playwright, Puppeteer, browser binary, image library, geometry library, layout-comparison package, Mermaid CLI, or model-provider SDK was added directly.

Update `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` with timestamps, actual test counts, discrepancies, and the final result. Append a revision note at the bottom of this plan describing the implementation-time changes. Stop after Stage 0 is green; do not begin Stage 1 in the same execution.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. The repository instruction file imports `/Users/wangzhihao/.codex/RTK.md`, so interactive shell commands must be prefixed with `rtk`. Use pnpm for all Node package operations and never use npm, yarn, or npx.

First inspect and bootstrap without overwriting the user's existing files:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short
    rtk node --version
    rtk pnpm --version
    rtk pnpm install
    rtk pnpm list --depth 0

After the lockfile exists, verify exact resolution and the initial harness:

    rtk pnpm install --frozen-lockfile
    rtk pnpm why mermaid
    rtk pnpm why @mermaid-lint/core
    rtk pnpm why @mermanjs/web
    rtk pnpm typecheck
    rtk pnpm test

While curating fixtures, run the focused command repeatedly:

    rtk pnpm compatibility

Before intentionally accepting snapshot changes, inspect the current diff. Then update and rerun without update mode:

    rtk git diff -- tests/compatibility
    rtk pnpm compatibility:update
    rtk git diff -- tests/compatibility
    rtk pnpm compatibility

The final focused result is a zero-failure Vitest summary, exactly 27 manifest fixtures, four observations per fixture, and therefore 108 normalized engine observations. The command also prints compact verdict-mismatch, diagnostic-precision, coordinate-expectation, and fact-completeness counts derived from the same in-memory matrix used by the assertions and snapshots.

Run the final local gate:

    rtk pnpm install --frozen-lockfile
    rtk pnpm check
    rtk pnpm compatibility
    rtk pnpm hygiene
    rtk git status --short --untracked-files=all

The expected result is zero type errors, zero failed tests, no changed snapshot after the second compatibility run, no generated JavaScript or source maps under `src/`, no whitespace errors across Git's tracked-and-untracked file set, and no unrelated user-file modification. The working tree will still contain untracked project files because this repository has no commits unless the user separately asks to stage or commit them.

For Node 22 and 24, use the checked-in `.github/workflows/ci.yml` matrix when a remote exists. A successful job on each runtime must perform `pnpm install --frozen-lockfile` and `pnpm check`. Local Node 22.20.0 and Node 24.18.0 gates already pass; hosted execution remains future CI evidence rather than a Stage 0 blocker.

## Validation and Acceptance

Stage 0 is accepted only when all of the following behavior is observable.

Running `pnpm compatibility` loads at least 27 repository-local diagrams across the five required families and returns a successful test run. The normalized snapshot contains four labeled observations for every fixture. The official observation accepts every manifest-valid fixture and rejects every manifest-invalid fixture. An invalid fixture produces a nonempty diagnostic and never appears as an engine crash.

Running the isolation tests against a child that exits nonzero and a child that prints malformed JSON returns structured `engine-error` observations. The Vitest process remains alive and reports passing assertions. This proves the distinction between user syntax rejection and infrastructure failure without implementing the Stage 1 long-lived worker.

The matrix records line and column only when an engine actually supplies them. It records `document` or `approximate` precision when no exact position exists. Five representative official diagnostics assert fixture-level coordinate spans or document-only precision, and the compact summary reports their pass count separately from the 9-of-15 availability count. No adapter fabricates an exact token range. Raw messages, stacks, temporary paths, full Mermaid error hashes, and raw Merman parse objects are absent from snapshots.

For every valid fixture with `expectedFacts`, the Merman adapter either returns the matching selected summary with `complete-for-fixture` or returns a visible partial/unavailable result that is explained in ADR 0001. Parser disagreement never changes the official expectation.

`docs/adr/0001-validation-foundation.md` answers the five Stage 0 open decisions, contains the exact versions and official initialization profile, and explains the reuse/contribute/fork boundary. `DRAFT-PLAN.md` reflects those resolved facts but still shows all Stage 1+ behavior as unimplemented.

`pnpm check` passes under local Node 22.20.0 and Node 24.18.0, and the Node 22/24 workflow remains ready for hosted execution. `.nvmrc` selects the exact local Node 24 profile. `package.json` contains exact pins and `private: true`; `pnpm-lock.yaml` is committed-ready; the evaluated versions are asserted against the package manifest; no forbidden visual dependency has been added; no product CLI, renderer, Markdown extractor, rule engine, LSP, or MCP server exists.

## Idempotence and Recovery

`pnpm install` and all test commands are safe to repeat. After the first lockfile creation, use `pnpm install --frozen-lockfile` so a registry change cannot silently rewrite the evaluated profile. If installation fails because a candidate package is unavailable or incompatible, do not delete user files or use another package manager. Record the exact failure, select the nearest compatible stable exact version, update this plan and ADR 0001, regenerate `pnpm-lock.yaml` with pnpm, and rerun the full corpus.

Compatibility snapshots are evidence. Never run `compatibility:update` as a blind repair for a red test. First decide whether the change is an intentional fixture, normalization, dependency, or profile change; inspect the diff; record the reason in `Decision Log`; then update and immediately rerun without update mode.

The adapters are disposable boundaries. If an upstream engine cannot initialize, keep its observation as `engine-error` and continue evaluating the canonical engine. If a child hangs, the process timeout must terminate only that child. Do not add a browser fallback during this plan; that would require a separate recorded decision and dependency approval.

Generated `dist/`, `coverage/`, and caches are ignored and may be regenerated. Do not use `git reset --hard`, `git checkout --`, or broad cleanup commands in this new, uncommitted repository. Do not commit unless the user asks.

## Artifacts and Notes

A normalized observation should resemble this shape; exact messages and counts will come from the corpus:

    {
      "fixtureId": "flowchart-invalid-edge",
      "engine": "official-mermaid",
      "engineVersion": "11.16.0",
      "verdict": "rejected",
      "errorFamily": "parse-error",
      "message": "Parse error on line 2...",
      "rawDiagramType": "flowchart-v2",
      "diagramType": "flowchart",
      "location": { "line": 2, "column": 6 },
      "locationPrecision": "approximate"
    }

Use this exact real-world Flowchart seed for a repository-local fixture. Its provenance at plan-authoring time was `~/Documents/playground/modern-agent/wiki/concepts/prompt-assembly.md`, around line 38:

    flowchart LR
      CONTRACT["Stable agent contract"] --> REQUEST["Model request"]
      CONTEXT["Dynamic context"] --> REQUEST
      HISTORY["Conversation state"] --> REQUEST
      TOOLS["Tool schemas"] --> REQUEST
      META["Request and cache metadata"] --> REQUEST

      REQUEST --> CLAUDE["Claude Code: system / messages / tools"]
      REQUEST --> CODEX["Codex: instructions / input / tools"]

Use this exact real-world State seed for a repository-local fixture. Its provenance at plan-authoring time was `~/Documents/playground/modern-agent/wiki/syntheses/codex-prompt-caching-source-code.md`, around line 105:

    stateDiagram-v2
        [*] --> SteadyState
        SteadyState --> PreTurnCompact: token limit / comp_hash change / model downshift
        SteadyState --> MidTurnCompact: follow up work plus limit reached
        SteadyState --> StandaloneTurn: manual compact (UI)
        PreTurnCompact --> LocalCompact
        PreTurnCompact --> RemoteCompact
        MidTurnCompact --> LocalCompact
        MidTurnCompact --> RemoteCompact
        StandaloneTurn --> LocalCompact
        StandaloneTurn --> RemoteCompact
        LocalCompact --> TrimOldest: ContextWindowExceeded
        TrimOldest --> LocalCompact
        LocalCompact --> ReplaceHistory
        RemoteCompact --> ReplaceHistory
        ReplaceHistory --> NewBaseline
        NewBaseline --> SteadyState

The final evidence transcript is:

    $ pnpm install --frozen-lockfile
    ok

    $ pnpm check
    Repository hygiene: clean across tracked and untracked files
    Test Files  7 passed (7)
    Tests       20 passed (20)

    $ pnpm compatibility
    Compatibility summary: 27 fixtures, 108 observations
    Verdict mismatches: mermaid-lint-official 0; mermaid-lint-aggregate 1 [pie-invalid-header]; merman 1 [pie-invalid-header]
    Official diagnostics: approximate locations 9/15; document-only 6/15; coordinate expectations 5/5
    Merman facts: complete 12/12; partial 0; unavailable 0
    Test Files  4 passed (4)
    Tests       16 passed (16)

    $ pnpm list --depth 0
    dependencies:
      @mermaid-lint/core 0.35.0
      @mermanjs/web 0.7.0
      mermaid 11.16.0
    devDependencies:
      @types/jsdom 21.1.7
      @types/node 24.13.3
      jsdom 26.1.0
      typescript 7.0.2
      vitest 4.1.10

    $ node --version
    v22.20.0

    $ nvm use
    Now using node v24.18.0

    $ node --version
    v24.18.0

    $ git remote -v
    # no configured remote; both local runtime gates passed

    $ pnpm hygiene
    Repository hygiene: clean across tracked and untracked files

## Interfaces and Dependencies

In `src/spike/contracts.ts`, define at least these project-owned contracts. Exact additional fields are allowed only when the corpus or ADR needs them:

    export type TargetDiagramType =
      | "flowchart"
      | "sequence"
      | "pie"
      | "class"
      | "state";

    export type EngineId =
      | "official-mermaid"
      | "mermaid-lint-official"
      | "mermaid-lint-aggregate"
      | "merman";

    export type EngineVerdict =
      | "accepted"
      | "rejected"
      | "unsupported"
      | "engine-error";

    export type ErrorFamily =
      | "parse-error"
      | "unsupported-type"
      | "initialization-error"
      | "engine-crash"
      | "unknown-engine-error";

    export type LocationPrecision = "exact" | "approximate" | "document";

    export interface CompatibilityCase {
      id: string;
      path: string;
      diagramType: TargetDiagramType;
      expectedCanonicalVerdict: "accepted" | "rejected";
      tags: string[];
      expectedLocation?: "line" | "line-column";
      expectedFacts?: SelectedFactSummary;
    }

    export interface EngineObservation {
      fixtureId: string;
      engine: EngineId;
      engineVersion: string;
      verdict: EngineVerdict;
      errorFamily?: ErrorFamily;
      message?: string;
      rawDiagramType?: string;
      diagramType?: TargetDiagramType;
      location?: { line?: number; column?: number };
      locationPrecision: LocationPrecision;
      facts?: SelectedFactSummary;
      factCompleteness?: "complete-for-fixture" | "partial" | "unavailable";
    }

    export interface CompatibilityAdapter {
      readonly id: EngineId;
      readonly version: string;
      observe(fixture: CompatibilityCase & { source: string }): Promise<EngineObservation>;
    }

Define `SelectedFactSummary` as a discriminated union owned by this project, with one small shape for each target family. It may contain IDs, endpoint pairs, labels, numeric values, and member counts. It must not contain upstream AST node types, Mermaid configuration, SVG/layout information, or untyped `unknown` payloads.

In `src/spike/run-isolated.ts`, expose an API equivalent to:

    export async function runEngineIsolated(
      engine: EngineId,
      fixtures: Array<CompatibilityCase & { source: string }>,
      options?: { workerPath?: string; timeoutMs?: number },
    ): Promise<EngineObservation[]>;

The default timeout should be generous enough for one cold engine import and the full corpus but bounded. A process-level failure returns one `engine-error` observation per requested fixture so matrix cardinality remains deterministic.

The intended exact direct dependencies at plan-authoring time are:

    mermaid                  11.16.0
    @mermaid-lint/core       0.35.0
    @mermanjs/web            0.7.0

The intended exact development dependencies are:

    jsdom                    26.1.0
    @types/jsdom             21.1.7
    @types/node              24.13.3
    typescript               7.0.2
    vitest                   4.1.10

Do not add Commander, Zod, lilconfig, fast-glob, Babel code frames, LSP libraries, MCP libraries, Mermaid CLI, Playwright, a browser binary, image tooling, or provider SDKs. Those either belong to later active stages or the explicitly deferred visual roadmap.

## Revision Note

2026-07-14 / Codex: Created the initial self-contained Stage 0 ExecPlan. The plan incorporates current package-surface inspection, isolates global-stateful engines by process, uses repository-local copies of the user-permitted wiki examples, and makes official Mermaid the only canonical verdict while measuring upstream reuse boundaries.

2026-07-14 / Codex: Executed and closed Stage 0. Added the exact-pinned private package, isolated four-path adapters, 27-fixture corpus, 108-observation snapshots, failure-isolation and dependency-boundary tests, ADR 0001, resolved roadmap facts, and final frozen-install evidence. Recorded the aggregate/Merman Pie false acceptance, partial composite-State facts, location coverage, and the honest absence of hosted Node 24 execution; no Stage 1 or visual behavior was added.

2026-07-14 / Codex: Reopened Stage 0 after review and hardened its evidence. Corrected recursive composite-State facts, structured upstream messages, source-line selection, fixture-level coordinate expectations, human-readable compatibility output, centralized engine versions, worker shape/timeout/error-path coverage, and tracked-plus-untracked hygiene validation. At this checkpoint Node 24 remained an explicit prerequisite before Stage 1.

2026-07-14 / Codex: Satisfied the remaining runtime prerequisite with nvm-managed Node 24.18.0, added `.nvmrc`, restored the default to Node 22.20.0, and passed the frozen install, full check, and compatibility gate on both local runtimes. Hosted CI remains unexecuted because the repository has no remote, but it is no longer needed to substantiate the Node 24 result.
