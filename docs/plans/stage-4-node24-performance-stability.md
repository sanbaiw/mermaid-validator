# Make the Stage 4 Node 24 gate durable

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` controls Stage 4 scope and exit criteria, `ARCHITECTURE.md` controls module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes official Mermaid as the sole canonical syntax authority. The predecessor `docs/plans/stage-4-lsp-adapter.md` owns the completed LSP behavior and correctness hardening. This plan owns only the remaining Node 24 test-process-contention work and the coordinated private `0.3.0` Stage 4 closeout.

## Purpose / Big Picture

After this work, a contributor on the recorded reference workstation can run the ordinary default `pnpm check` repeatedly on the supported Node 24.18.0 runtime without valid Mermaid input being misreported as `system/parser-timeout`. The same final tree also passes on Node 22.20.0. The proof is deliberately stronger than one lucky run: the final default configuration must pass three consecutive Node 24 full gates and one Node 22 full gate, run serially with no retry and no concurrent test session. This is the local Stage 4 closeout proof, not a hosted-CI or cross-platform certification; broader production and CI hardening remains Stage 6 work.

The user-visible CLI and language-server behavior does not change apart from the coordinated private version metadata advancing to `0.3.0`. Official Mermaid remains the canonical syntax authority, the canonical worker's 10-second startup/request deadline remains unchanged, the real CLI and LSP process tests remain present, and the opt-in LSP timing characterization remains descriptive rather than an SLA. The performance implementation changes only the test runner's file-worker budget so Vitest workers and the Node child processes they create do not exhaust the workstation at the same time; the remaining edits record the already-planned Stage 4 version and closeout evidence.

When the durability proof succeeds, close Stage 4 as the private `0.3.0` CLI plus LSP cut. Keep the package private, do not publish, stage, commit, tag, or push, and do not begin Stage 5 Semantic Facts or any Stage 6 or visual work.

## Progress

- [x] (2026-07-29 17:58Z) Read `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, the completed Stage 4 LSP ExecPlan, the current worker host, Vitest configuration, process-heavy tests, package/version surfaces, and the exact installed Vitest 4.1.10 CLI and type definitions.
- [x] (2026-07-29 17:58Z) Preserved the dirty Stage 4 worktree and refreshed the baseline: Node 22.20.0 default `pnpm check` passed 264 tests with one opt-in skip in 105.36 seconds; the worktree remained unchanged after generated `dist/` output.
- [x] (2026-07-29 17:58Z) Reproduced the blocker under Node 24.18.0: default `pnpm check` failed five tests in five files with canonical timeout consequences while 259 tests passed and the 27-fixture/108-observation compatibility summary remained unchanged.
- [x] (2026-07-29 17:58Z) Ran two no-edit Node 24 controls. `vitest run --no-file-parallelism` passed 264 tests with one skip in 192.57 seconds; `vitest run --maxWorkers=2` passed the same suite in 111.08 seconds.
- [x] (2026-07-29 17:58Z) Drafted this standalone, self-contained performance stability and Stage 4 closeout plan.
- [x] (2026-07-29 18:01Z) Reviewed this plan against `PLANS.md`, the Stage 4 scope lock, exact current paths, failure evidence, fallback logic, and final version surfaces. Added the missing dual-runtime frozen-install evidence, clarified final-tree gate ordering, and synchronized the predecessor handoff without authorizing implementation.
- [x] (2026-07-29 18:17Z) Re-reviewed the proposed implementation against the current Vitest 4.1.10 code, Stage 4 design intent, and the dirty worktree. Kept the bounded two-worker design, moved completion claims after the evidence that justifies them, paired each compatibility run with its runtime's frozen install, and defined which later edits invalidate the durability proof.
- [ ] Implement the bounded Vitest worker policy without changing product code, dependencies, parser deadlines, test deadlines, retries, skips, or real-process coverage.
- [ ] Prepare the private `0.3.0` executable/version-assertion surface while Stage 4 documentation truthfully remains closeout-blocked.
- [ ] Pass three consecutive default Node 24.18.0 full gates, the focused Node 24 compatibility gate, then one default Node 22.20.0 full gate and its focused compatibility gate on the unchanged final gate-sensitive surface.
- [ ] Synchronize the successful evidence into every live documentation surface, complete an independent read-only implementation review, resolve concrete findings, and stop without staging or committing.

## Surprises & Discoveries

- Observation: The existing `sequence: { concurrent: false }` setting serializes tests inside a file but does not serialize test files.
  Evidence: The exact installed Vitest 4.1.10 CLI reports `fileParallelism` as true by default and the default pool as `forks`. Its installed type definition says that `fileParallelism: false` forces `maxWorkers` to one. The current `vitest.config.ts` does not set either option.

- Observation: File-level process amplification, not an isolated LSP assertion, explains the current failure shape.
  Evidence: The test files that reach real canonical work include validation contracts, CLI integration, LSP process/parity, and one real planner path inside the internal LSP server suite. A Vitest fork has its own module-level canonical host, CLI tests launch another Node process whose validator forks a worker, and an LSP client launches a server that can fork its own canonical worker.

- Observation: The failure is reproducible on the current 12-logical-CPU, 16 GiB Intel macOS workstation and is not confined to the three files in the earlier review.
  Evidence: The 2026-07-29 Node 24 default full gate failed five tests across `tests/contract/validation/rules-and-fixes.test.ts`, `tests/contract/validation/validate-document.test.ts`, `tests/integration/cli/cli.test.ts`, `tests/integration/lsp/parity.test.ts`, and `tests/internal/lsp/server.test.ts`. Direct validation returned `system/parser-timeout`; the CLI returned exit 3 with that Finding; LSP parity lost its CLI subprocess; and the real fix planner became `unsafe` after its canonical revalidation timed out.

- Observation: Reducing only Vitest file-worker concurrency is sufficient to turn the same Node 24 tree green without weakening product behavior.
  Evidence: With no repository edits, `--maxWorkers=2` passed 29 test files/264 tests with one opt-in skip in 111.08 seconds. Full file serialization also passed but took 192.57 seconds. The default failing run took 118.58 seconds, so two workers retained almost all observed wall-clock throughput while removing the observed contention.

- Observation: A single passing two-worker run is useful promotion evidence but is not the Stage 4 exit proof.
  Evidence: Earlier Node 24 implementation-time gates passed before a fresh later gate failed. This plan therefore requires three consecutive default full gates after the setting is checked into `vitest.config.ts`, and restarts that count after any configuration fallback or final-tree edit that affects tests or versions.

- Observation: Completion status and repeated-runtime evidence cannot be written truthfully before the repeated gates that establish them.
  Evidence: The earlier milestone order told `DRAFT-PLAN.md` and `ARCHITECTURE.md` to mark Stage 4 complete with actual repeated evidence immediately after only one Node 24 preflight. Version constants must be final before acceptance, but completion prose must remain blocked until the complete runtime matrix succeeds.

- Observation: A runtime-specific compatibility result is clearest when it runs before another runtime performs a frozen reinstall.
  Evidence: The earlier command order installed with Node 22 before returning to the Node 24 compatibility command. The dependency tree is currently portable, but pairing Node 24 install/check/compatibility and then Node 22 install/check/compatibility removes that avoidable ambiguity and remains fully serial.

## Decision Log

- Decision: Treat this as test-runner resource budgeting, not a product timeout defect.
  Rationale: The same valid inputs pass in isolation and under bounded file-worker concurrency. Raising the canonical 10-second deadline would delay real CLI and editor failure feedback while hiding a parent test-runner scheduling problem.
  Date/Author: 2026-07-29 / User and Codex.

- Decision: First implement top-level `maxWorkers: 2` in `vitest.config.ts` and retain the default `forks` pool, file isolation, and `sequence.concurrent: false`.
  Rationale: The exact candidate passed the current Node 24 suite in 111.08 seconds, compared with 192.57 seconds for one worker. It is the least restrictive evidence-backed setting that limits simultaneous Vitest forks without changing test order, pool semantics, product code, or real process boundaries.
  Date/Author: 2026-07-29 / Codex.

- Decision: If any required default Node 24 full-gate run fails with a canonical startup/request timeout or another credible resource-contention symptom at two workers, replace `maxWorkers: 2` with `fileParallelism: false` and restart the entire final runtime matrix from run one.
  Rationale: Vitest 4.1.10 defines `fileParallelism: false` as a one-worker policy, and the measured one-worker control passed. A deterministic fallback is preferable to retries, timeout inflation, test deletion, or an open-ended search for the highest workstation-specific parallelism.
  Date/Author: 2026-07-29 / Codex.

- Decision: Do not introduce Vitest projects, custom schedulers, test tags, file-name allowlists, or a process-heavy suite partition in this plan.
  Rationale: Those mechanisms create more configuration and omission risk than the current 30-file private suite justifies. A bounded global worker budget is visible in one place and covers canonical, compatibility, CLI, and LSP child-process amplification together.
  Date/Author: 2026-07-29 / Codex.

- Decision: Preserve the 20-second Vitest per-test timeout, the 10-second product canonical startup/request deadlines, the existing opt-in-only performance test, and every ordinary real-process test.
  Rationale: These values and tests express separate contracts. The test timeout bounds a Vitest test case, the product timeout bounds one canonical worker operation, and the opt-in test characterizes latency without becoming a CI SLA. None causes the file-worker amplification.
  Date/Author: 2026-07-29 / User and Codex.

- Decision: Make no source-architecture or dependency change and write no ADR.
  Rationale: `vitest.config.ts` is test orchestration. Diagram Validation, Canonical Syntax, CLI, LSP, their imports, and all exact-pinned packages remain unchanged, so the accepted module graph and upstream ownership do not move.
  Date/Author: 2026-07-29 / Codex.

- Decision: After the bounded configuration has a green Node 24 preflight, advance package, CLI, LSP, and matching assertions to private `0.3.0`, but keep roadmap, architecture, reference, README, and predecessor-plan completion claims blocked until the complete runtime matrix succeeds.
  Rationale: Stage 4 reserves `0.3.0` for its coordinated closeout, so acceptance must exercise the final executable/version-assertion surface. Documentation must not claim repeated evidence before it exists; evidence-only closeout edits can follow the gates without changing the executable behavior that was tested.
  Date/Author: 2026-07-29 / Codex.

- Decision: Treat `vitest.config.ts`, `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `src/**`, `tests/**`, and TypeScript configuration as the gate-sensitive surface. An edit to that surface after a successful durability run resets the Node 24 count and requires the complete runtime matrix again; recording already-observed evidence in Markdown does not.
  Rationale: The repeated proof must cover one unchanged executable and test configuration. Living-plan and closeout prose must be updated after evidence exists, but those Markdown-only edits cannot affect Vitest scheduling, product behavior, version assertions, or dependency resolution.
  Date/Author: 2026-07-29 / Codex.

- Decision: Run Node 24 compatibility immediately after the Node 24 frozen install and three full gates, then switch once to the Node 22 frozen install, full gate, and compatibility gate.
  Rationale: This preserves a simple serial matrix and ties each runtime's focused result to the dependency installation established under that runtime.
  Date/Author: 2026-07-29 / Codex.

- Decision: Scope the Stage 4 durability claim to the recorded local workstation and both supported runtime lines; do not claim hosted-CI or cross-platform certification.
  Rationale: The observed failure and promotion controls were measured on one 12-logical-CPU, 16 GiB Intel macOS host. The fixed two-worker configuration removes CPU-count-dependent Vitest defaults, but this plan has no evidence from other operating systems or hosted runners, and Stage 6 already owns broader production and CI hardening.
  Date/Author: 2026-07-29 / Codex.

- Decision: Do not stage or commit during execution of this plan.
  Rationale: Repository instructions require a separate user request for commits, and the current worktree contains the intentionally preserved uncommitted Stage 4 implementation plus earlier unrelated README/performance-document changes.
  Date/Author: 2026-07-29 / Codex.

## Outcomes & Retrospective

Planning outcome: complete and review-hardened. The current evidence identifies Vitest file-worker amplification as the remaining Stage 4 blocker and selects a two-worker default with a measured one-worker fallback. The review corrected the closeout/evidence order, runtime pairing, and durability invalidation rules. No implementation has been made by this planning pass.

Implementation outcome: pending. Completion requires a final private `0.3.0` tree, three consecutive default Node 24 full gates, one Node 22 full gate, both focused compatibility gates, independent review, synchronized living documents, and no product timeout or coverage weakening.

## Context and Orientation

The repository is one private TypeScript ESM package in `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. pnpm 10.30.1 manages exact-pinned dependencies. `.nvmrc` selects Node 24.18.0, while `package.json` also supports the verified Node 22 line. `pnpm check` runs TypeScript checking, a build into `dist/`, repository hygiene, and then the full Vitest suite.

The current worktree is intentionally dirty. `main` is five commits ahead of `origin/main`. The Stage 4 LSP source, tests, reference page, dependency changes, roadmap/architecture edits, and correctness-hardening edits are not yet committed. `README.md` also includes a pre-existing performance-reference change and `docs/performance/2026-07-23-modern-agent-scan.md` is an unrelated untracked Stage 2 snapshot. Inspect and preserve every existing diff; never reset, clean, stage, overwrite, or reconstruct the tree.

`src/validation/canonical-syntax/worker-host.ts` owns the product canonical worker. A `CanonicalSyntaxWorkerHost` lazily forks `dist/validation/canonical-syntax/worker-entry.js`, waits up to 10 seconds for startup, waits up to 10 seconds for a request, and reuses the successful child within that Node process. The module-level `defaultHost` is shared only within one process. Each separate Vitest worker, CLI process, or LSP process has a separate module graph and can therefore create another canonical child.

Vitest's default non-browser pool is `forks`, meaning it runs test files in child processes. `sequence.concurrent: false` controls concurrency among tests and suites within a file. `fileParallelism` controls whether different files run at the same time, and `maxWorkers` limits how many Vitest workers may be active. In exact Vitest 4.1.10, `fileParallelism: false` implies one worker. This plan retains fork isolation because it matches the existing suite and keeps mutable module-level state isolated; it only bounds the number of simultaneously active file workers.

The failure is a false product result produced under test contention. Valid Mermaid returns the stable Finding `system/parser-timeout`, which is correct behavior when the worker genuinely exceeds its product deadline but incorrect evidence for a valid-input acceptance test when the parent test runner starves the child. The goal is to stop inducing that resource starvation in the repository gate, not to suppress the Finding or widen its deadline.

The architecture remains unchanged. `src/validation/` owns Diagram Validation; `src/validation/canonical-syntax/` hides official Mermaid and JSDOM; `src/cli/` and `src/lsp/` are inward-facing delivery adapters that use only `src/validation/index.ts`; Compatibility Evidence may observe the product but product modules never import it. No file in `src/` needs a performance change for this plan.

For this plan, the gate-sensitive surface is the set of files that can change the installed dependency graph, built product, test behavior, or runtime selection: `vitest.config.ts`, `.nvmrc`, `package.json`, `pnpm-lock.yaml`, `src/**`, `tests/**`, and the TypeScript configuration files. The three consecutive Node 24 runs must exercise one unchanged gate-sensitive surface. Markdown evidence may be recorded afterward because it cannot change the tested behavior; any later review fix to the gate-sensitive surface invalidates the earlier count and requires the complete runtime matrix again.

## Plan of Work

### Milestone 1: Bound the default Vitest file-worker budget

Edit only `vitest.config.ts`. Inside the existing `test` object, add a short comment explaining that canonical, CLI, and LSP tests create nested Node processes, then add `maxWorkers: 2`. Retain `environment: "node"`, `testTimeout: 20_000`, the current include glob, file isolation, the default forks pool, `sequence: { concurrent: false }`, and the snapshot format. Do not set a CLI-only environment variable; the ordinary `pnpm check` command must pick up the policy from the checked-in configuration.

Do not change `src/validation/canonical-syntax/worker-host.ts`, `tests/internal/canonical-syntax/worker-host.test.ts`, any LSP/CLI test, `package.json` scripts, or dependencies in this milestone. Do not add retry, shuffle, a longer test timeout, a longer worker timeout, another skip, or conditional runtime behavior.

Build and run one Node 24 preflight using the ordinary `pnpm check` command with no Vitest worker flag. It must report 29 passed files plus the one opt-in skipped file, 264 passed tests plus one skipped test, and no `system/parser-timeout`. If this preflight fails for a non-contention correctness reason, diagnose and revise the plan before changing behavior. If it fails with the known contention shape, apply the one-worker fallback described below and rerun the preflight.

At the end of this milestone, `vitest.config.ts` alone carries the performance change and a default Node 24 full gate is green. This preflight is not counted as one of the final three runs because the executable `0.3.0` version surface is still pending.

### Milestone 2: Prepare the final private `0.3.0` executable surface

After the green preflight, update the Stage 4 executable version surface from `0.2.0` to private `0.3.0`: `package.json`, `src/cli/main.ts`, `src/lsp/server.ts`, and matching CLI/LSP assertions in `tests/unit/cli/main.test.ts`, `tests/integration/cli/cli.test.ts`, `tests/internal/lsp/server.test.ts`, and `tests/integration/lsp/lsp.test.ts`. Inspect `pnpm-lock.yaml`; do not alter transitive packages named `0.2.0`, and change no lockfile content unless pnpm proves the workspace importer actually records the root package version.

Do not yet change the current JSON-v2 example in `docs/reference/json-output-v2.md`, the version sentence in `README.md`, or any completion/status prose in `DRAFT-PLAN.md`, `ARCHITECTURE.md`, or `docs/plans/stage-4-lsp-adapter.md`. Those files must continue to say that Stage 4 is closeout-blocked until the runtime evidence exists. Historical Stage 1/2/3 plans and JSON-v1 examples retain their historical versions.

Update this plan's `Progress` to record that the executable version surface is ready, while leaving its implementation outcome pending. Preserve `README.md`'s earlier Stage 2 performance link and every unrelated line. Do not modify `docs/performance/2026-07-23-modern-agent-scan.md`.

At the end of this milestone, every executable version constant and matching assertion agrees on private `0.3.0`, completion documentation remains truthfully blocked, Stage 5 remains absent, and the worktree is ready for final repeated gates.

### Milestone 3: Prove durability on the final executable surface

Run the complete matrix serially. Before each full gate, confirm that this execution has not left another Vitest, compatibility, CLI integration, LSP integration, or canonical-worker test session running. Do not launch another repository test session while a gate is active. If another repository test session is observed, do not count the gate and do not kill a process this execution did not start; wait for a quiet window instead. Do not run the gates in parallel and do not use `--retry`, `--maxWorkers`, `--no-file-parallelism`, or another CLI override; the point is to prove the checked-in default.

Run `pnpm check` three separate consecutive times under Node 24.18.0 without editing the gate-sensitive surface between runs. Retain each full transcript summary and Vitest duration independently, then record them in this plan. All three must pass 29 files/264 tests with the existing one opt-in file/test skipped and no parser timeout. A failure resets the count to zero after the cause is addressed.

If any run fails with the known resource-contention shape while `maxWorkers: 2` is active, edit `vitest.config.ts` to remove `maxWorkers` and set `fileParallelism: false` with the same nested-process explanation. This exact setting forces one worker in Vitest 4.1.10 and already passed the no-edit control. Update the Decision Log and evidence, repeat the Node 24 frozen install, then restart all final acceptance from the first Node 24 run. Do not attempt worker counts between one and two, because no such integer exists, and do not compensate with a retry or timeout change.

Before the final repeated gates, run `pnpm install --frozen-lockfile` once under Node 24.18.0. After three Node 24 successes, run the focused Node 24 `pnpm compatibility` gate. Then run `pnpm install --frozen-lockfile` once under Node 22.20.0, one ordinary Node 22 `pnpm check`, and the focused Node 22 `pnpm compatibility` gate. Each compatibility run must pass four files/16 tests and retain 27 fixtures/108 observations, the two known noncanonical `pie-invalid-header` mismatches, five of five coordinate expectations, and 12 of 12 complete selected Merman fact summaries.

Run `git diff --check` and inspect the complete status and intended diffs. Confirm there is no new dependency, skip, retry, timeout change, source architecture change, Stage 5 directory, visual dependency, generated source beside TypeScript, or modification to the unrelated performance snapshot.

At the end of this milestone, the private `0.3.0` executable and test surface has the repeated evidence required to close Stage 4. Do not edit that gate-sensitive surface while recording the result.

### Milestone 4: Record, review, and hand off the closed stage

After the complete matrix succeeds, update the current JSON-v2 example in `docs/reference/json-output-v2.md` and the version sentence in `README.md` to `0.3.0`. Update `DRAFT-PLAN.md` to mark Stage 4 complete with the actual date, selected runner policy, final test counts, and repeated-runtime evidence. Keep Stage 5 not started and all visual work deferred. Update the Stage 4 state and verification evidence in `ARCHITECTURE.md`; state that architecture is unchanged and the gate was stabilized by bounding Vitest file workers. Do not add a module, import rule, dependency, or ADR.

Update `docs/plans/stage-4-lsp-adapter.md` rather than rewriting its history. Mark its performance handoff complete, add the final runtime evidence to `Progress`, `Outcomes & Retrospective`, `Artifacts and Notes`, and a dated Revision Note, and link this plan as the owner of the implemented runner policy. Preserve earlier failed and isolated-run evidence as history. Update this plan's living sections with the selected two-worker or fallback one-worker setting, all actual outputs, and the completed outcome.

Request an independent read-only review of the final worktree against this plan, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, and the Stage 4 LSP plan. The reviewer must focus on whether the checked-in default truly owns the worker bound, whether every final gate ran without an override or retry, whether the product and Vitest deadlines remained unchanged, whether process tests remain present, whether version/status surfaces agree, whether evidence was recorded only after it existed, and whether unrelated dirt was preserved.

Resolve every concrete correctness or contract finding and rerun validation proportional to the changed surface. If a fix touches the gate-sensitive surface, immediately reopen the completion status in the living documents, rerun the complete durability matrix, and replace the recorded evidence before marking Stage 4 complete again. A Markdown-only evidence or wording fix requires `git diff --check` and focused inspection but does not invalidate the already-tested executable surface. Finish the living sections and append a dated Revision Note. Stop without staging, committing, tagging, pushing, publishing, or starting Stage 5.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix. Use pnpm for Node work and patch-based edits for repository files.

Inspect the baseline without cleaning it:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch --untracked-files=all
    rtk git log -1 --oneline
    rtk node --version
    rtk pnpm --version
    rtk sed -n '1,80p' vitest.config.ts
    rtk rg -n '0\.2\.0|0\.3\.0|closeout blocked|Stage 4 state' package.json src tests docs README.md DRAFT-PLAN.md ARCHITECTURE.md

Use the exact runtime paths below so the pnpm shim is available with either NVM runtime:

    Node 24 PATH: /Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin
    Node 22 PATH: /Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin

After adding the two-worker setting, run the Node 24 preflight with no Vitest-specific override:

    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check

Apply only the executable `0.3.0` version constants and matching test assertions after that preflight passes; keep completion documentation blocked. Establish the final frozen Node 24 installation, run the final Node 24 command three separate times, then run Node 24 compatibility before switching runtimes. Do not turn these into parallel jobs or a retrying shell loop:

    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility

Run the Node 22 final gate and its focused compatibility gate:

    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility

Only after that matrix succeeds, update README, current reference examples, roadmap, architecture, the predecessor plan, and this plan from blocked/pending status to the actual `0.3.0` closeout evidence.

The expected full-gate summary, unless review adds an intentional test, is:

    Test Files  29 passed | 1 skipped (30)
    Tests       264 passed | 1 skipped (265)

The expected focused compatibility summary is:

    Test Files  4 passed (4)
    Tests       16 passed (16)
    Compatibility summary: 27 fixtures, 108 observations

Finish with scoped integrity checks:

    rtk git diff --check
    rtk git status --short --branch --untracked-files=all
    rtk git diff -- vitest.config.ts package.json src/cli/main.ts src/lsp/server.ts README.md docs/reference/json-output-v2.md DRAFT-PLAN.md ARCHITECTURE.md docs/plans/stage-4-lsp-adapter.md docs/plans/stage-4-node24-performance-stability.md tests/unit/cli/main.test.ts tests/integration/cli/cli.test.ts tests/internal/lsp/server.test.ts tests/integration/lsp/lsp.test.ts
    rtk rg -n 'retry|testTimeout|startupTimeoutMs|requestTimeoutMs|it\.skip|test\.skip|describe\.skip' vitest.config.ts src/validation/canonical-syntax tests
    rtk rg -n '0\.2\.0|0\.3\.0|closeout blocked|Stage 4 state' package.json src tests docs README.md DRAFT-PLAN.md ARCHITECTURE.md

Historical Stage 1/2/3 plan text, JSON-v1 examples, dependency versions such as `points-on-curve@0.2.0`, and prose describing the prior private `v0.2` release are expected matches and must not be rewritten mechanically.

## Validation and Acceptance

This plan is accepted only on the final versioned worktree. `vitest.config.ts` contains either the promoted `maxWorkers: 2` policy or the evidence-triggered `fileParallelism: false` fallback. The ordinary `pnpm check` command uses that setting without a CLI or environment override.

The final Node 24.18.0 gate-sensitive surface passes three consecutive default full gates without changing between runs. Each run passes all 29 ordinary test files and 264 ordinary tests, skips only the existing opt-in LSP performance file/test, and produces no canonical timeout for valid input. A retry does not count, a run concurrent with another repository test session does not count, and evidence from before the final executable version/assertion edits does not count. If an implementation-review fix intentionally adds a test, update the exact counts throughout this living plan and rerun the complete matrix; every ordinary test must pass and the sole opt-in skip must remain the only skip.

Frozen installation succeeds under Node 24.18.0 and Node 22.20.0. The final Node 22 tree passes one default full gate with the same counts. The focused compatibility suite passes on both runtimes with 27 fixtures/108 observations and unchanged snapshots. `git diff --check` passes.

The canonical worker's `DEFAULT_TIMEOUT_MS` remains 10,000 for both startup and request defaults. Vitest's `testTimeout` remains 20,000. No retry is configured. No ordinary process test is removed, skipped, converted to a fake-only test, or weakened. `tests/integration/lsp/performance.test.ts` remains opt-in through `MERMAID_VALIDATOR_LSP_PROFILE=1` and its timing numbers remain descriptive.

The CLI, LSP, Diagram Validation, Canonical Syntax, and Compatibility Evidence source behavior is unchanged except for the coordinated version constants. The LSP still validates unsaved buffers, rejects stale results, projects UTF-16 positions, and returns only planner-approved versioned Quick Fixes. The CLI still validates files and repositories with the same JSON-v2 and exit semantics. Official Mermaid remains the canonical verdict.

All live version surfaces say `0.3.0`: package metadata, CLI output, LSP `serverInfo`, JSON-v2 current example, README, and matching assertions. Only after the matrix succeeds, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, the Stage 4 LSP plan, and this plan say Stage 4 is complete with the actual runtime evidence. Historical version evidence remains unchanged. The package stays private with no exports, declarations, publication, tag, or commit.

No Semantic Facts, new semantic rule, MCP, SARIF/JUnit, GitHub Action, editor extension, rendering, geometry, image, layout, vision, new dependency, module split, or ADR is introduced. The unrelated README performance link and `docs/performance/2026-07-23-modern-agent-scan.md` remain preserved.

## Idempotence and Recovery

The configuration edit is safe to repeat. `maxWorkers: 2` is one explicit scalar in `vitest.config.ts`; the fallback replaces it with `fileParallelism: false` rather than combining contradictory settings. Rebuilding `dist/` is repeatable and generated output must never be edited manually or emitted beside TypeScript source.

Frozen installation is also repeatable. If pnpm refuses a runtime switch because the existing modules directory would need interactive removal, rerun that same runtime's install as `pnpm install --frozen-lockfile --force`; do not change the lockfile, package manager, or dependency versions to work around the prompt.

Run every durability gate serially. If a command is interrupted, do not count it; confirm its child processes have exited and restart that run. If one of the final three Node 24 gates fails, the consecutive count returns to zero after the cause is resolved. Never turn a failed attempt into success with Vitest retry.

If the two-worker policy shows the known contention shape, apply the documented one-worker fallback, repeat the Node 24 frozen install, and restart the entire final matrix. If the one-worker fallback also reports a canonical timeout, stop: the current evidence no longer supports test-runner contention as the complete cause. Record the new failure and investigate worker lifecycle or an environmental regression in this plan before changing a product or test timeout.

If an unrelated test fails, reproduce it in isolation, distinguish a real correctness defect from contention, and revise the plan before broad edits. Do not hide a correctness failure by lowering concurrency. Any implementation fix outside `vitest.config.ts` and coordinated version/docs surfaces requires an explicit Decision Log entry and architecture review.

Preserve the dirty worktree. Never use `git reset`, `git checkout --`, `git clean`, or broad deletion as recovery. Do not stage or commit without a separate user request.

## Artifacts and Notes

Planning-time environment:

    Worktree: main...origin/main [ahead 5], Stage 4 implementation uncommitted
    Node default: v22.20.0
    Node primary: v24.18.0
    pnpm: 10.30.1
    Vitest: 4.1.10
    Platform: darwin 23.4.0, x64
    Logical CPUs: 12
    Memory: 16 GiB

Current Node 22 default full gate, run before this plan was authored:

    Test Files  29 passed | 1 skipped (30)
    Tests       264 passed | 1 skipped (265)
    Duration    105.36s

Current Node 24 default full gate that reproduced the blocker:

    Test Files  5 failed | 24 passed | 1 skipped (30)
    Tests       5 failed | 259 passed | 1 skipped (265)
    Duration    118.58s
    Failure     valid canonical work became system/parser-timeout after 10000ms
    Compatibility summary remained 27 fixtures / 108 observations

Node 24 one-worker control with no repository edit:

    Command      pnpm exec vitest run --no-file-parallelism
    Test Files   29 passed | 1 skipped (30)
    Tests        264 passed | 1 skipped (265)
    Duration     192.57s

Node 24 two-worker promotion control with no repository edit:

    Command      pnpm exec vitest run --maxWorkers=2
    Test Files   29 passed | 1 skipped (30)
    Tests        264 passed | 1 skipped (265)
    Duration     111.08s

These times characterize this workstation and are not SLAs. The acceptance signal is repeated correctness under the checked-in default, not a maximum duration or a requirement that two workers always outperform one.

## Interfaces and Dependencies

No product behavior or structural interface changes. `validateDocument()`, `planDocumentFixes()`, `DocumentSnapshot`, `ValidationResult`, canonical worker messages, CLI JSON-v2, and LSP protocol projections retain their Stage 4 contracts; only the coordinated private tool/server version metadata advances to `0.3.0`. No upstream type crosses a new seam.

The only intended behavior-setting edit is equivalent to this inside the existing `test` object in `vitest.config.ts`:

    // Canonical, CLI, and LSP suites create nested Node processes, so bound file-worker amplification.
    maxWorkers: 2,

If and only if the repeated Node 24 evidence rejects that candidate, replace it with:

    // Canonical, CLI, and LSP suites create nested Node processes, so serialize test files.
    fileParallelism: false,

Do not set both. Keep `pool` unspecified so the exact Vitest 4.1.10 default remains `forks`, and keep isolation enabled. Add no package and change no exact dependency version.

The final direct dependencies remain Commander 15.0.0, Globby 16.2.2, JSDOM 26.1.0, `mdast-util-from-markdown` 2.0.3, Mermaid 11.16.0, `vscode-languageserver` 10.1.0, `vscode-languageserver-textdocument` 1.0.12, and Zod 4.4.3. The LSP protocol remains transitive at 3.18.2. Development-only compatibility engines and test tool versions remain unchanged.

## Revision Note

2026-07-29: Created the standalone Stage 4 Node 24 performance stability ExecPlan after reproducing five default full-suite timeout consequences and comparing exact no-edit one-worker and two-worker controls. The plan promotes `maxWorkers: 2`, defines `fileParallelism: false` as the evidence-triggered fallback, preserves every product/test timeout and real-process contract, requires three consecutive Node 24 default gates plus one Node 22 gate on the final private `0.3.0` tree, and leaves Stage 5, publication, commits, and visual work out of scope.

2026-07-29: Completed the planning review against repository authorities and current paths. Added explicit frozen-install commands for both supported runtimes, clarified that only sessions started by this execution must be drained before a gate, changed the two-worker description to least restrictive rather than smallest, and retained implementation as the next unchecked milestone.

2026-07-29: Re-reviewed the proposed implementation against the current Vitest 4.1.10 behavior and Stage 4 design intent. Kept the evidence-backed `maxWorkers: 2` policy and one-worker fallback, but moved completion claims after the full runtime proof, paired each compatibility gate with its runtime's frozen install, defined the gate-sensitive surface that must remain unchanged across durability runs, clarified when a review fix requires the complete matrix again, and scoped the evidence to the recorded local workstation rather than claiming hosted-CI or cross-platform certification.
