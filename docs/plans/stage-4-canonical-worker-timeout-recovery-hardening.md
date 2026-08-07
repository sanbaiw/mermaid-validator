# Bound canonical-worker restart storms after infrastructure timeouts

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` controls product scope and delivery stages, `ARCHITECTURE.md` controls module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes exact-pinned official Mermaid as the sole canonical syntax authority. This plan is a focused post-Stage-4 hardening pass over the published CLI preview and checkout-only LSP. It does not start Stage 5 Semantic Facts, add a dependency, change the canonical Mermaid verdict, publish a release, or reactivate visual work.

## Purpose / Big Picture

After this work, one validator process scanning a repository will no longer appear to hang for roughly one parser deadline per diagram when its canonical Mermaid child cannot start or repeatedly cannot finish requests. The first source-independent startup failure will stop more worker launches in that process for a bounded period. One request timeout will still permit the next diagram to use a fresh worker, preserving recovery from a diagram-specific parser hang, but a second consecutive request timeout will temporarily suppress additional worker starts in the same process. Every affected diagram will still receive an honest system Finding; no unvalidated diagram will be reported as valid.

The user-visible proof has two parts. First, timeout messages will say whether the worker failed while starting or while handling a Mermaid request, while retaining the existing `system/parser-timeout` Finding code and JSON-v2 schema. Second, a synthetic multi-diagram outage that currently launches and waits for one worker per diagram will launch only the bounded number allowed by the recovery policy: one launch for a startup outage, or two timed-out request attempts before suppression. Terminal mode without a fix option will emit each completed document's diagnostics immediately in deterministic document order, so the first infrastructure failure is visible before the whole collection finishes. JSON output remains one complete deterministic object.

The worker itself remains unchanged in role. It is still one ordinary Node child process running `worker-entry.js`, JSDOM, and official Mermaid. There is no probe-worker binary, worker pool, synthetic health-check diagram, or parallel parse path. The new state belongs entirely to the parent-side worker host and controls only whether another ordinary worker may be started.

## Progress

- [x] (2026-08-06 17:42Z) Read all of `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the current Canonical Syntax host/protocol/runtime, CLI aggregation code, focused worker/CLI tests, the Stage 1 worker plan, the Stage 2 repository plan, and the completed Stage 4 timeout-contention and diagnostic-hardening plans.
- [x] (2026-08-06 17:42Z) Triaged the motivating external repository incident: an unchanged Mermaid page first returned `system/parser-timeout` after 10,000 ms, then the same page passed in 6.8 seconds, a direct canonical request passed in about 4.0 seconds, and the full wiki scan passed in 7.8 seconds; the affected documentation edit contained no Mermaid.
- [x] (2026-08-06 17:42Z) Resolved the planning model with the user: worker count is always zero or one; the host needs only starts-allowed versus starts-suppressed policy, a consecutive request-timeout counter, and a bounded suppression interval. A “probe worker” is not a distinct implementation.
- [x] (2026-08-06 17:48Z) Created and reviewed this self-contained ExecPlan against `PLANS.md`, the active-stage boundaries, the current code, and the dirty worktree; implementation and product tests have not started.
- [x] (2026-08-06 18:56Z) Reopened design review and resolved its first branch with the user: a request resolved because worker starts are suppressed is a distinct internal `restart-suppressed` outcome with a structured cause, not a fabricated timeout or replay of the triggering failure.
- [x] (2026-08-06 18:56Z) Resolved the second review branch with the user: map the distinct suppressed outcome to the new public Finding code `system/parser-restart-suppressed`; keep JSON schema version 2 and exit class 3.
- [x] (2026-08-06 18:56Z) Resolved the third review branch with the user: keep post-ready runtime, crash, and protocol recovery unchanged because the code proves a theoretical restart-storm shape but the motivating field evidence proves only repeated timeouts; record the other families as a residual risk rather than broadening this pass.
- [x] (2026-08-06 18:56Z) Resolved the fourth review branch with the user: the request-timeout streak tracks actual parser attempts, so only cancellation of a request already sent to a ready worker clears it; queued, startup-waiting, and suppression-time cancellation do not mutate recovery state.
- [x] (2026-08-06 18:56Z) Resolved the fifth review branch with the user: use one simple expiry rule for every suppression cause. Expiry always resets the request-timeout streak to zero, so a later interval requires two new consecutive request timeouts before suppression opens again.
- [x] (2026-08-06 18:56Z) Resolved the sixth review branch with the user: validate the injected clock once during host construction, then require finite monotonic readings by internal contract; do not add product recovery state for a deliberately broken test clock.
- [x] (2026-08-06 18:56Z) Resolved the seventh review branch with the user: replace speculative 5/10/20/30-second exponential backoff with one fixed 5,000 ms demand-driven suppression interval; reconsider escalation only after field metrics justify it.
- [x] (2026-08-06 18:56Z) Resolved the eighth review branch with the user: keep document-at-a-time streaming for ordinary non-fix terminal mode, accepting partial completed-document stdout if a later operation is interrupted; JSON and fix modes remain aggregated.
- [x] (2026-08-06 18:56Z) Resolved the ninth review branch with the user: in non-fix modes, emit all known sorted read failures to stderr before validation begins; then stream terminal diagnostics or retain atomic JSON stdout. Fix modes keep combined read/write-error aggregation.
- [x] (2026-08-06 18:56Z) Resolved the tenth review branch with the user: retain the 10,000 ms startup and 10,000 ms request deadlines; obtain phase-specific evidence before planning any separate deadline change.
- [x] (2026-08-06 18:56Z) Resolved the cross-process scope branch with the user: this plan bounds repeated launches inside one validator process and explicitly does not coordinate the first worker launch across concurrent CLI/LSP processes; later metrics must establish whether process-level limits need a separate plan.
- [x] (2026-08-06 19:44Z) Resolved the suppression-message branch with the user: fix five cause-specific public messages and omit remaining-time text so cached outcomes remain truthful for their full interval.
- [x] (2026-08-06 19:44Z) Ran the focused pre-implementation baseline after design review: 3 test files and 32 tests passed in 5.84 seconds; product source remains unchanged.
- [x] (2026-08-07) Completed the reopened design review and final consistency pass. The plan now contains every agreed branch, an explicit extended `EngineFailure` union, and acceptance coverage that rejects worker-supplied host-only outcomes and private detail.
- [ ] Milestone 1: make startup timeout, request timeout, and restart suppression structurally distinct while preserving the existing timeout code and deadlines.
- [ ] Milestone 2: implement and prove bounded worker-start suppression, deterministic recovery, cancellation, and process-exit behavior.
- [ ] Milestone 3: stream completed non-fix terminal diagnostics while keeping JSON and fix-mode aggregation contracts intact.
- [ ] Milestone 4: update current architecture, roadmap, recovery-history documentation, and user-facing timeout examples.
- [ ] Milestone 5: pass focused, dual-runtime, compatibility, package, integrity, and independent review gates; record actual evidence here.

## Surprises & Discoveries

- Observation: The current timeout Finding cannot identify which timer fired.
  Evidence: `src/validation/canonical-syntax/worker-host.ts` creates separate startup and request timers, but both produce `failure: "timeout"` and the identical message `Canonical Mermaid parser timed out after 10000ms`. The motivating transcript therefore cannot prove whether initialization or parsing crossed the deadline.

- Observation: A timeout can turn one reusable cold start into one cold start per diagram.
  Evidence: the host discards the child on timeout and lazily starts a new child for the next request. Diagram Validation validates Markdown blocks and repository documents sequentially. Under a persistent outage, every later diagram reaches the same start-discard path.

- Observation: Canonical startup is a material fixed cost, but 10 seconds is a deadline rather than the expected duration.
  Evidence: the planning-time, currently untracked snapshot `docs/performance/2026-07-23-modern-agent-scan.md` records fresh-process one-diagram runs of 3.04–4.06 seconds versus 0.21–0.49 seconds for zero-diagram Markdown. Preserve that user-owned file, but do not depend on it: this paragraph embeds the figures needed by the plan. The worker must fork Node, load JSDOM and Mermaid, install DOM globals, initialize Mermaid, and only then send `ready`. The observed successful runs do not justify assuming that a healthy worker needs 10 seconds.

- Observation: The old no-circuit decision explicitly waited for real repository evidence.
  Evidence: `docs/plans/stage-2-repository-and-markdown-input.md` makes parser-system outcomes block-local and says operational circuit breaking is deferred until real repository evidence justifies it. The 16-page repeated-timeout incident is that evidence; this plan retains one Finding per block but bounds worker restarts in the Canonical Syntax owner.

- Observation: “Healthy” and “half-open” are misleading implementation states in this repository.
  Evidence: the host already serializes every request and owns at most one worker. A post-suppression worker is byte-for-byte the same worker and processes the first real pending diagram. The only new policy question is whether worker starts are currently allowed.

- Observation: Terminal aggregation amplifies the perception of a hang.
  Evidence: `src/cli/run-cli.ts` awaits every document, stores all `ValidatedDocument` records, and only then formats terminal or JSON output. A system Finding known after the first timeout remains invisible until all later documents complete.

- Observation: Post-ready runtime, crash, and protocol failures share the worker-discard-and-restart mechanism, but no field evidence shows a repeated storm for those families.
  Evidence: `src/validation/canonical-syntax/worker-host.ts` discards the worker for every returned engine failure, and focused tests prove fresh-worker recovery after runtime, crash, and protocol failures. The motivating 16-page incident observed only `system/parser-timeout`; under the Stage 2 evidence threshold, the other families remain a known residual risk rather than scope for this plan.

- Observation: Host-local suppression cannot limit simultaneous first launches across validator processes.
  Evidence: the incident research recorded 16 page-level validator invocations running concurrently, which can create 16 parent CLI processes and 16 initial Mermaid/JSDOM children. `CanonicalSyntaxWorkerHost` state is process-local, and this plan adds no shared daemon, lock, semaphore, or filesystem coordination. The later local-metrics plan records overlapping sessions so a separate process-level policy can be evidence-driven.

## Decision Log

- Decision: Treat this as post-Stage-4 canonical-worker recovery hardening and keep Stage 5 not started.
  Rationale: The change corrects timeout classification, worker restart policy, and existing terminal delivery behavior. It adds no Semantic Facts, rule, parser, delivery adapter, public programmatic interface, or visual capability.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Keep official Mermaid 11.16.0 under the ADR 0001 JSDOM profile as the only canonical verdict.
  Rationale: Restart suppression decides when the canonical engine is unavailable; it never substitutes another engine or converts an infrastructure failure into syntax acceptance or rejection.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Keep one serialized worker and one in-flight request. Do not create a probe worker, worker pool, daemon, browser fallback, or synthetic health-check source.
  Rationale: Mermaid and JSDOM use mutable process-global state, and the existing isolated serialized worker is the accepted correctness boundary. The first real request after suppression naturally proves whether the ordinary worker recovered and produces a useful result at the same time.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Represent timeout phase structurally inside the internal Syntax Outcome as `"startup"` or `"request"`.
  Rationale: The host already knows which timer fired. Structured phase makes recovery decisions and tests independent of message text, while phase-specific messages make field diagnosis possible. Syntax Outcome is internal and does not cross the Diagram Validation seam.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Represent a request resolved by worker-start suppression as a distinct internal `restart-suppressed` engine failure with a structured cause identifying the prior startup failure family or consecutive request timeouts.
  Rationale: The suppressed request did not start a worker and did not itself time out. Reusing the triggering failure would make a timeout `phase` claim about a timer that never ran, blur current-request outcome with recovery cause, and make later internal metrics infer suppression from misleading data. The suppressed outcome carries no timeout phase or private `debugDetail`.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Preserve `system/parser-timeout` for requests whose startup or request timer actually fires, and add `system/parser-restart-suppressed` for requests resolved without a worker launch while starts are suppressed. Keep JSON-v2 schema version 2, exit-code precedence, and document/block cardinality.
  Rationale: A suppressed request did not time out, fail initialization, crash, or violate the protocol, so reusing the triggering request's code would mislead machine consumers even if the message were careful. `Finding.code` is already an open string, JSON-v2 explicitly has no backward-compatibility promise, and adding a stable code changes a value rather than the JSON shape. Every suppressed request remains invalid and exits in infrastructure class 3 because it was not canonically validated.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Preserve the 10,000 ms startup deadline, 10,000 ms request deadline, and no-retry rule in this plan.
  Rationale: The incident proves unbounded restart amplification and missing phase evidence, not which deadline should change. Raising both deadlines would make a restart storm slower and hide the missing lifecycle policy. After phase-specific observations exist, a separate evidence-backed plan may change only the startup deadline if cold-start percentiles justify it.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Open start suppression immediately for a source-independent pre-ready failure, including startup timeout, explicit initialization failure, synchronous fork failure, or worker exit/protocol failure before `ready`.
  Rationale: No Mermaid source has been processed, so changing diagrams cannot cure the failure. Repeating the same startup once per diagram only spends more resources and delays the collection.
  Date/Author: 2026-08-06 / Codex.

- Decision: Let the first request timeout fail its current diagram, kill the worker, and permit the next request to start one fresh worker; open suppression on a second consecutive request timeout.
  Rationale: A request timeout may be source-specific, so one later diagram deserves an independent worker. Two consecutive request timeouts across fresh workers are enough evidence to stop a per-diagram restart storm. The failed diagram is never retried.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Treat the request-timeout count as a literal streak of actual parser attempts. An engine-responsive verdict, a different post-ready failure, or cancellation of an active request already sent to a ready worker clears that streak. Cancelling a queued request, a request waiting for worker startup, or a request while starts are suppressed does not change it. Expiry of a suppression interval starts a new streak at zero.
  Rationale: Two request timeouts must refer to two adjacent ordinary parser attempts in the same recovery interval. A request that never reached a ready worker is absent from that attempt sequence; letting its cancellation clear global state would make an unrelated queued caller hide two consecutive timeouts. Active cancellation and unrelated active failure families interrupt the attempt sequence without proving recovery. An accepted syntax result, rejected syntax result, or officially accepted but unsupported type proves that the worker completed parsing; a syntax error is unhealthy input but healthy infrastructure.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Do not count post-ready runtime, crash, or protocol failures toward start suppression in this plan.
  Rationale: The current discard path and tests prove that those families could theoretically repeat worker launches, but the real repository incident proves only a request-timeout storm. Stage 2 deliberately required real operational evidence before adding circuit breaking. Preserve fresh-worker recovery for the unobserved families, document the residual risk, and widen suppression later only if field evidence justifies the behavioral change.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Use one fixed, monotonic, demand-driven 5,000 ms worker-start suppression interval; do not add exponential escalation in this plan.
  Rationale: The field incident proves the need to bound repeated launches within a scan, and a fixed interval does that without another mutable duration or reset policy. It does not prove that a long-lived process crosses repeated failed recovery intervals, so 5/10/20/30-second escalation would be speculative state. Store one optional suppression record containing its deadline and replay-safe outcome, and compare its deadline only when a request arrives; do not create a cooldown timer that could keep the one-shot CLI alive. The later opt-in metrics plan can supply evidence for a separate escalation change if needed.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: On every suppression expiry, unconditionally reset the request-timeout streak to zero rather than branching on the prior suppression cause.
  Rationale: One expiry rule keeps the recovery model small and gives each new interval the same source-specific-hang allowance. A persistent request outage may therefore consume two fresh request deadlines in each recovery interval before suppression reopens; that bounded cost is accepted in preference to cause-sensitive probation behavior.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Validate one initial reading from the injected monotonic clock during `CanonicalSyntaxWorkerHost` construction, then treat finite, nondecreasing later readings as an internal test-seam contract.
  Rationale: Production uses `performance.now()`, and no user-facing option can replace it. Suppression opens from asynchronous worker and timer callbacks, so promising a synchronous throw for every later bad reading is impossible without either an uncaught process error or extra product failure state. A deliberately broken mutable test clock does not justify another host mode or Finding path.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: While starts are suppressed, resolve requests immediately with a bounded project-owned system outcome derived from the suppression reason, without a worker launch, retry, sleep, or retained stderr detail.
  Rationale: Suppression must reduce both latency and resource use. The message must say that restart is temporarily suppressed after a startup failure or consecutive request timeouts; it must not claim that the current diagram itself timed out. Private worker stderr must not be retained and replayed across unrelated requests.
  Date/Author: 2026-08-06 / Codex.

- Decision: Use one exact public suppression message per structured cause and do not include the interval or remaining time.
  Rationale: The message crosses terminal, JSON-v2, and LSP projections and therefore must not be invented independently by implementations or tests. A cached outcome cannot truthfully state a changing remaining duration. Synchronous fork failure uses the startup-initialization message; pre-ready exit/disconnect uses the startup-process-crash message; malformed startup IPC uses the startup-protocol message.
  Date/Author: 2026-08-06 / User and Codex.

  The exact messages are:

      Canonical Mermaid parser restart is temporarily suppressed after a startup timeout
      Canonical Mermaid parser restart is temporarily suppressed after a startup initialization failure
      Canonical Mermaid parser restart is temporarily suppressed after a startup process crash
      Canonical Mermaid parser restart is temporarily suppressed after a startup protocol failure
      Canonical Mermaid parser restart is temporarily suppressed after consecutive request timeouts

- Decision: Stream completed document diagnostics only for ordinary non-fix terminal mode; keep JSON-v2 and both fix modes aggregated.
  Rationale: Sorted sequential validation already determines terminal order, and valid documents produce no terminal text. Streaming makes the first infrastructure Finding visible without altering the final bytes or order of a completed run. An interrupted run may retain stdout for documents that already completed; that non-atomic terminal behavior is accepted. JSON must remain one complete object, and fix modes retain their preparation/apply semantics rather than being mixed into this recovery change.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: In non-fix terminal and JSON modes, write all known `input/read-failed` lines to stderr in sorted path order before starting validation. Keep fix-mode input-error emission aggregated after planning and application.
  Rationale: Reads already finish before validation begins. Early stderr preserves the existing read-error-before-terminal-diagnostic call order when terminal stdout becomes streaming and exposes known failures promptly. JSON stdout remains one complete object after validation. Fix modes can discover `input/write-failed` only later and retain the current combined sorted reporting rather than splitting their error stream into phases.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Limit restart suppression to one validator process and make cross-process worker coordination an explicit non-goal of this plan.
  Rationale: The host can bound its own repeated launches without a dependency or new architecture edge. Coordinating 16 independent CLI processes would require shared operating-system state, ownership, stale-lock recovery, and a process-limit policy that this incident has not yet quantified. State plainly that concurrent processes may each launch one initial worker, let the opt-in metrics plan measure overlap, and require a separate evidence-backed design before adding global coordination.
  Date/Author: 2026-08-06 / User and Codex.

- Decision: Add no dependency, package export, version bump, commit, tag, push, or publication in this plan.
  Rationale: Existing Node, TypeScript, child-process, clock, CLI, and Vitest capabilities are sufficient. Release and Git actions require separate user authorization.
  Date/Author: 2026-08-06 / Codex.

## Outcomes & Retrospective

Planning outcome: the reopened design review is complete and implementation has not started. The agreed model has one ordinary worker at most, starts allowed or suppressed, one consecutive request-timeout counter, one fixed demand-driven suppression interval, and no probe or escalation state. Complete this section after every implementation milestone and replace this planning-only statement with actual behavior, remaining gaps, and validation evidence.

## Context and Orientation

The repository is one TypeScript ESM package rooted at `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. pnpm 10.30.1 manages exact-pinned dependencies. `.nvmrc` selects Node 24.18.0, and `package.json` supports Node `^22.13.0 || >=24.0.0`. The current published CLI preview version is 0.3.2. At plan creation the worktree intentionally contains an unrelated modified `README.md` and untracked `docs/performance/2026-07-23-modern-agent-scan.md`; preserve both and do not stage or rewrite them except for a narrowly required documentation addition that can be separated from the user's existing README edit.

A **worker** in this plan is the Node child process running `src/validation/canonical-syntax/worker-entry.ts` after compilation. It installs a JSDOM browser-like environment, imports exact-pinned Mermaid, waits for a Mermaid source request, runs `detectType()` and official `parse()`, and returns a JSON-serializable Syntax Outcome over Node inter-process communication. It does not scan files, extract Markdown, run custom rules, format diagnostics, or render an image.

The **worker host** is `src/validation/canonical-syntax/worker-host.ts` in the parent CLI or LSP process. It lazily forks the worker, serializes requests through one FIFO queue, holds at most one active request, captures bounded private stderr, enforces startup and request timers, kills failed children, and keeps a successful idle child unreferenced so a one-shot CLI can exit. `src/validation/canonical-syntax/protocol.ts` owns the internal JSON-serializable message and Syntax Outcome types. `src/validation/canonical-syntax/index.ts` is the only seam root Diagram Validation may import.

A **startup timeout** begins after the host forks a child and ends when the child sends `ready`. It covers process startup, module loading, JSDOM setup, Mermaid import, and Mermaid initialization. A **request timeout** begins only after a ready worker receives a real Mermaid source and ends when that request returns a response. Both deadlines are currently 10,000 ms, but the host collapses them into one internal classification and message.

**Start suppression** means that the host temporarily refuses to fork another worker. It does not keep a failed child alive and does not make the caller sleep. A request arriving before the current suppression record's `until` deadline resolves immediately with its system outcome. The fixed **suppression interval** is a launch-rate control, not a claim about how long a healthy worker takes; this plan does not escalate it after repeated failures.

The host's policy can be described without adding an enum. Starts are allowed when the optional suppression record is absent or its `until` deadline is no longer in the future. Starts are suppressed when that record exists and its deadline is in the future. Worker count is a separate existing value: zero before lazy startup or after discard, and one while starting, active, or reusable idle.

All of that state is local to one `CanonicalSyntaxWorkerHost` instance in one operating-system process. A separate CLI or LSP process has its own host and may launch its own first worker at the same time. This plan neither coordinates those processes nor changes the number of validator commands an external tool may run concurrently.

The current CLI path in `src/cli/run-cli.ts` loads configuration, discovers and reads files, then validates sorted snapshots sequentially through `src/validation/index.ts`. Root Diagram Validation in `src/validation/validate-document.ts` validates each extracted Markdown diagram sequentially through Canonical Syntax and maps every internal engine failure to a stable system Finding. Terminal and JSON formatting belong to the CLI adapter. The checkout-only LSP also enters through `src/validation/index.ts`; it must not learn about worker suppression or import Canonical Syntax internals.

Architecture remains unchanged. Canonical Syntax owns timeout phase, worker lifecycle, start suppression, and recovery. Diagram Validation owns mapping internal outcomes to Findings. CLI owns when terminal text is written and JSON collection aggregation. No delivery adapter may deep-import `worker-host.ts`, and no root validation file may bypass `src/validation/canonical-syntax/index.ts`. `mermaid` and `jsdom` remain imported only by `mermaid-runtime.ts` in product code. Compatibility Evidence remains separate and stays at 27 fixtures and 108 observations.

The motivating failure shape is:

    diagram 1 -> cold worker -> 10s timeout -> kill
    diagram 2 -> cold worker -> 10s timeout -> kill
    ...
    diagram N -> cold worker -> 10s timeout -> kill

The target shape for a startup outage is:

    diagram 1 -> cold worker -> startup timeout -> suppress starts
    diagram 2..N -> immediate system outcomes, no child launch

The target shape for request timeouts is:

    diagram 1 -> ready worker -> request timeout -> kill, count 1
    diagram 2 -> fresh ready worker -> request timeout -> kill, suppress starts
    diagram 3..N -> immediate system outcomes, no child launch

## Plan of Work

### Milestone 1: Distinguish startup and request timeouts

Refine the internal protocol before changing recovery behavior. In `src/validation/canonical-syntax/protocol.ts`, make a timeout engine failure carry a required `phase: "startup" | "request"`, while other engine failures retain their existing shape. Keep this type internal; do not export it from `src/validation/index.ts`, package metadata, JSON, or LSP data.

Update the project-owned outcome construction and message validation in `src/validation/canonical-syntax/worker-host.ts`. The startup timer must produce `Canonical Mermaid parser startup timed out after 10000ms`; the active-request timer must produce `Canonical Mermaid parser request timed out after 10000ms`. Update every synthetic timeout created by tests or injected validation dependencies. The IPC response type and runtime guard must reject both timeout and `restart-suppressed`, because only the parent host owns timers and applies suppression policy. `src/validation/validate-document.ts` must continue mapping either actual timeout phase to `system/parser-timeout`, map host-produced `restart-suppressed` to `system/parser-restart-suppressed`, and discard internal `phase`, suppression cause, and `debugDetail` from the Finding. Add the new code to `BuiltInFindingCode` in `src/validation/findings.ts`.

Extend `tests/internal/canonical-syntax/worker-host.test.ts` to assert both phases independently. Use a fake worker that never sends `ready` for startup timeout and the existing ready-but-nonresponsive worker for request timeout. Extend contract tests to prove that both actual timeout outcomes map to the existing stable timeout Finding code and exit class 3. Milestone 2 adds contract coverage for the new restart-suppressed code. At the end of this milestone, the old repeated restart behavior may still exist, but the phase is reliable and observable.

Also prove the IPC ownership boundary: a worker response that supplies `failure: "timeout"`, `failure: "restart-suppressed"`, or `debugDetail` must be rejected as a protocol failure rather than trusted as a host-produced outcome.

### Milestone 2: Bound worker starts and prove recovery

Add only internal testable options to `WorkerHostOptions` in `src/validation/canonical-syntax/worker-host.ts`:

    readonly restartSuppressionMs?: number
    readonly now?: () => number

Production defaults to a fixed 5,000 ms suppression interval. The default clock must be monotonic, such as `performance.now()` from `node:perf_hooks`; tests inject a mutable clock so suppression tests never sleep for real seconds. The constructor samples the clock once and rejects a thrown or non-finite initial value synchronously. After construction, an injected test clock must return finite, nondecreasing values by contract; do not add runtime recovery state for a clock that later violates that internal contract. Do not add a public configuration flag or environment variable.

Add private state equivalent to:

    #consecutiveRequestTimeouts = 0
    #suppression: {
      readonly until: number
      readonly outcome: RestartSuppressedOutcome
    } | undefined

Do not add a separate worker-mode enum or parallel optional fields for deadline and outcome. Before queuing or pumping a request, if starts remain suppressed, resolve that request immediately with the bounded cached system outcome after removing any abort listener. If suppression has expired, clear the entire suppression record, clear the consecutive request-timeout streak, and allow normal lazy worker startup. An engine-responsive verdict and `dispose()` also clear the entire record, so an outcome can never outlive its deadline.

Create private helpers that open suppression, settle all currently queued requests, reset recovery state after an engine-responsive verdict, and construct a replay-safe `restart-suppressed` outcome with a structured cause and without `debugDetail`. When suppression opens, discard the worker exactly once, resolve the triggering request with its original failure, resolve other queued requests with the distinct suppressed outcome, and atomically store `{ until: now() + restartSuppressionMs, outcome }` in the one suppression field. A request arriving during suppression must not be enqueued or start a timer.

Open suppression immediately when failure occurs before `ready`, because no source was processed. This includes synchronous fork failure, startup timeout, explicit `initialization-failed`, exit/disconnect before ready, and malformed startup protocol. Preserve each original stable failure family for the triggering request. Suppressed later requests receive `failure: "restart-suppressed"`, a structured cause that retains the prior startup failure family, and the exact cause-specific message in the Decision Log. Map synchronous fork failure to startup initialization failure, pre-ready exit/disconnect to startup process crash, and malformed startup IPC to startup protocol failure.

For a request timeout after `ready`, resolve the current request with phase `request`, discard the worker, and increment `#consecutiveRequestTimeouts`. If the new count is one, keep starts allowed so the next real diagram may use a fresh worker. If the count reaches two, open suppression and resolve queued or later requests immediately. An accepted, syntax-error, or unsupported-type response clears the timeout streak and suppression state. Cancellation is not an engine failure and must retain current abort behavior; it does not open suppression or change the fixed suppression duration. Cancelling the active request after it was sent to a ready worker clears the timeout streak because that parser attempt interrupts consecutiveness. Cancelling work that has not been sent does not change the streak.

Keep current recovery behavior for post-ready runtime, crash, and protocol failure in this plan. They still fail the current request, discard the worker, and allow the next request to start a fresh one. Each clears the request-timeout streak because it interrupts consecutiveness without proving that official parsing recovered. Do not silently count unrelated failure families toward suppression while implementing helpers.

Add or refine fake workers under `tests/fixtures/workers/` so tests can count child launches and deterministically produce startup delay, request timeout, and successful recovery. Tests must prove all of these behaviors:

- eight concurrent requests behind a worker that never becomes ready cause one launch, one original startup-timeout outcome, and immediate `restart-suppressed` outcomes for the remaining requests;
- sequential requests made during startup suppression do not create another worker;
- advancing the injected clock beyond suppression allows one ordinary worker launch;
- a successful official-style outcome after suppression restores normal worker reuse;
- one request timeout allows the next request to start a fresh worker;
- a second consecutive request timeout opens suppression and later requests do not launch children;
- active cancellation after send or a different post-ready failure between request timeouts makes the later timeout the first timeout of a new streak;
- cancellation of a queued, startup-waiting, or suppression-time request between two actual request timeouts does not clear the streak or permit a third worker launch;
- a syntax-error response counts as healthy infrastructure and resets timeout state;
- repeated failed recovery intervals each use exactly the fixed 5,000 ms suppression duration and add no escalation state;
- queued and active abort semantics, `dispose()`, bounded stderr, idle unref, and successful sequential reuse remain intact;
- no suppression timer or child handle keeps a short Node caller alive.

At the end of this milestone, run the focused host and validation contract tests and a small built-process exit check. Record exact counts and durations in `Progress` and `Artifacts and Notes`.

### Milestone 3: Make terminal failure progress visible

Refactor non-fix execution in `src/cli/run-cli.ts`. After all reads finish, sort and write every known `input/read-failed` line to stderr before validation starts. In ordinary terminal mode, after each sorted document finishes validation, append its `ValidatedDocument` record for exit-code calculation and immediately write `formatTerminal(result, document.text)` when non-empty. Do not write progress lines for valid documents. Do not change terminal diagnostic text, document order, exit precedence, or the validation sequence. Ensure the final common block does not print the early read errors or streamed diagnostics a second time.

Retain full stdout aggregation for `--format json`, `--fix`, and `--fix-dry-run`. Non-fix JSON may write its known sorted read-error lines to stderr before validation, but it must emit exactly one schema-v2 object to stdout only after all readable documents finish. Fix modes must retain their current plan-all-before-apply behavior, combined sorted read/write-error stderr reporting, and deterministic record ordering.

Extend `tests/unit/cli/main.test.ts` with event-ordered tests. Inject one read failure plus two readable documents and prove the sorted read-error stderr write occurs before the first validation. Prove the first terminal stdout write occurs after the first validation but before the second validation, and assert final stdout content and order remain identical to formatting the same records at the end. Add a JSON assertion that its read-error stderr line may precede validation but no stdout write occurs until all validations complete. Existing integration CLI tests must continue proving valid silence, system exit 3, JSON completeness, and fix behavior.

### Milestone 4: Synchronize current documentation without rewriting history

Update `ARCHITECTURE.md` in the existing Canonical Syntax responsibility to say that it owns phase-specific deadlines and bounded fixed-duration worker-start suppression. Do not add a module, edge, dependency, or ADR: the work stays inside an already accepted responsibility.

Update `DRAFT-PLAN.md` parser-isolation and current preview-hardening evidence to state the implemented per-process behavior, its cross-process non-goal, and actual verification. Keep Stages 0–4 complete, Stage 5 not started, Stage 6 boundaries unchanged, and visual work deferred. Do not rewrite the historical Stage 4 closeout claim that the then-current 10-second deadlines and no-retry policy remained unchanged; this plan still preserves both.

Append a dated revision note to `docs/plans/stage-2-repository-and-markdown-input.md` rather than editing its 2026-07-19 decision. Explain that the old plan deliberately deferred operational circuit breaking until real repository evidence, and that this later plan activates host-owned bounded start suppression while preserving one system Finding per attempted block and never treating a suppressed block as valid. Add a corresponding cross-reference to the Stage 1 plan only if needed to prevent its historical “next request starts a fresh worker” prose from being mistaken for the current unconditional policy; do not rewrite completed milestone history.

Leave historical `docs/reference/json-output-v1.md` unchanged: it documents output that predated phase-specific messages and restart suppression. Update `docs/reference/json-output-v2.md` and current README text wherever they contain a live exact timeout message, stable-code list, or recovery description. Preserve JSON schema version 2 and every existing Finding code, and add `system/parser-restart-suppressed` to current public code documentation. Because `README.md` is already modified by the user, inspect its existing diff first and make any required edit as a narrow non-overlapping patch; if no current statement needs correction, leave it untouched.

### Milestone 5: Complete dual-runtime and distribution-safe acceptance

Run focused tests first, then the ordinary full gate and Compatibility Evidence serially under Node 24.18.0 and a supported Node 22 runtime. Do not run another repository test session concurrently, do not add a retry, and do not raise product or Vitest timeouts to obtain green evidence. Record actual test counts rather than copying historical counts.

Run package smoke because the changed worker-host and protocol files ship in the CLI-only tarball. Confirm the installed CLI shim validates a known-good diagram and exits without a leaked child handle. Package contents must remain restricted to the accepted compiled CLI and Validation graph; LSP, source, tests, fixtures, plans, and Compatibility Evidence stay excluded.

Request an independent read-only review of the final worktree. The review must challenge phase classification, suppression outcome honesty, queued and sequential launch bounds, fixed suppression duration, monotonic-clock behavior, cancellation races, terminal write ordering, JSON atomicity, LSP recovery, process exit, public code/schema stability, architecture boundaries, and preservation of unrelated changes. Resolve every concrete finding and rerun validation proportional to the changed surface. A source/test correction requires the full dual-runtime gates again; a documentation-only correction requires focused integrity checks.

## Concrete Steps

Run all commands from:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator

Inspect and preserve the baseline:

    rtk git status --short --branch --untracked-files=all
    rtk git diff -- README.md
    rtk node --version
    rtk pnpm --version
    rtk sed -n '1,360p' src/validation/canonical-syntax/worker-host.ts
    rtk sed -n '1,180p' src/validation/canonical-syntax/protocol.ts
    rtk sed -n '180,290p' src/cli/run-cli.ts

Run the focused baseline before editing and record its exact result:

    rtk pnpm exec vitest run tests/internal/canonical-syntax/worker-host.test.ts tests/contract/validation/validate-document.test.ts tests/unit/cli/main.test.ts

After Milestone 1, rebuild and run phase-focused tests:

    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/canonical-syntax/worker-host.test.ts tests/contract/validation/validate-document.test.ts tests/internal/validation/outcome-mapping.test.ts

After Milestone 2, run worker lifecycle, CLI process, and LSP parity coverage:

    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/canonical-syntax/worker-host.test.ts tests/integration/cli/cli.test.ts tests/integration/lsp/parity.test.ts tests/internal/lsp/server.test.ts

After Milestone 3, run CLI unit, reporter, integration, and JSON contract coverage:

    rtk pnpm build
    rtk pnpm exec vitest run tests/unit/cli/main.test.ts tests/unit/cli/reporters.test.ts tests/integration/cli/cli.test.ts tests/contract/validation/validate-document.test.ts

Use the repository-selected Node 24 runtime for the primary final installation and gates. Keep Node 24 first in `PATH` and use the installed pnpm 10.30.1 shim:

    rtk proxy env CI=true PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm package:smoke

Then run the supported Node 22 matrix. If the exact local patch version differs, record it; do not use Node 23 as substitute evidence:

    rtk proxy env CI=true PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility

Finish with scoped integrity inspection:

    rtk git diff --check
    rtk git status --short --branch --untracked-files=all
    rtk git diff -- src/validation/canonical-syntax src/validation/validate-document.ts src/cli/run-cli.ts tests/internal/canonical-syntax tests/fixtures/workers tests/unit/cli tests/contract/validation tests/integration/cli DRAFT-PLAN.md ARCHITECTURE.md docs/plans/stage-1-canonical-syntax-cli.md docs/plans/stage-2-repository-and-markdown-input.md docs/reference README.md
    rtk rg -n 'DEFAULT_TIMEOUT_MS|startupTimeoutMs|requestTimeoutMs|retry|restartSuppression|#suppression|system/parser-timeout|system/parser-restart-suppressed|schemaVersion' src tests docs DRAFT-PLAN.md ARCHITECTURE.md
    rtk rg -n 'playwright|puppeteer|sharp|pixelmatch|openai|vision|geometry|render' package.json pnpm-lock.yaml src tests

Do not stage, commit, tag, push, or publish. Those actions are outside this plan.

## Validation and Acceptance

Acceptance is behavioral, not merely structural.

A startup timeout must be distinguishable from a request timeout in the internal outcome and stable message. Both actual timeouts must map to `system/parser-timeout`, source `system`, error severity, document or mapped block precision as today, and process exit class 3. A request resolved during suppression must instead carry the distinct internal `restart-suppressed` failure and structured cause, map to `system/parser-restart-suppressed`, and use the same source, severity, precision, and exit class without carrying a timeout phase. Its message must equal the corresponding exact Decision Log string and must not contain an interval, remaining duration, source, or private detail. Neither `phase`, suppression cause, nor private `debugDetail` may appear as a Finding field, JSON field, terminal metadata field, or LSP data field.

For a startup-outage fixture with eight requests already queued, the worker launch marker must equal one. The first request receives the original startup-timeout outcome and maps to `system/parser-timeout`; the other seven receive immediate `restart-suppressed` outcomes that map to `system/parser-restart-suppressed`, whose structured cause identifies the prior startup timeout, and whose message explicitly says restart is suppressed after startup failure. Sequential requests before the injected clock reaches the stored `until` deadline must leave the marker at one. Advancing the clock to or beyond that deadline and issuing one request must increase it to two, proving recovery is demand-driven.

For a request-outage fixture, the first timed-out request must fail without retry and leave starts allowed. The next real request must start one fresh worker. If it also times out, starts become suppressed. Any additional queued or sequential requests before suppression expiry must resolve without a child launch. Suppression expiry unconditionally starts a new request-timeout streak at zero, so a persistent request outage receives two new timeout attempts before the same fixed 5,000 ms interval reopens. Cancellation of an active request after send or a different post-ready failure between two timeouts must break the streak; cancellation of a request that never reached a ready worker must not. A later accepted, syntax-error, or unsupported outcome must restore normal reuse.

Suppression tests must use an injected monotonic clock and launch markers, not wall-clock sleeps. Repeated recovery failure must demonstrate the same 5,000 ms interval every time and the absence of escalation state. No scheduled cooldown timer may appear in active-handle tests or keep a one-shot process alive.

Cancellation must remain distinct from failure. Aborting a queued or startup-waiting request removes only that request and does not change the request-timeout streak; if cancellation leaves no work behind an unready worker, retain the existing child-discard behavior without changing recovery state. Aborting an active request already sent to a ready worker kills the child and rejects that call with `AbortError`, without incrementing the count, changing the suppression duration, or opening suppression; it clears an existing timeout streak. A pre-aborted signal presented during suppression still rejects with `AbortError`, while later cancellation cannot change an already settled suppressed outcome. `dispose()` rejects queued/active work, clears recovery state, kills the child, and leaves no handle.

In non-fix modes, all known read-error stderr lines must be sorted and written before the first validation call. Ordinary terminal mode must then write a first document's non-empty diagnostics before beginning validation of the second document while preserving sorted stdout bytes and exit precedence when the run completes. If a later operation is interrupted, stdout for already completed documents may remain; terminal output is intentionally non-atomic. Valid terminal documents remain silent. JSON-v2 may already have written bounded read errors to stderr, but must make no stdout write until all validation records and input errors are known, then emit exactly one parseable object with `schemaVersion: 2`. Fix modes retain current combined read/write-error aggregation and file-safety behavior.

Canonical behavior must not drift. All valid and invalid fixtures retain official Mermaid 11.16.0 verdicts, target diagram-family normalization, source mapping, syntax help, rules, fixes, CLI/LSP parity, and Compatibility Evidence. `pnpm compatibility` remains 27 fixtures and 108 observations unless an independently justified upstream-evidence change is recorded; this recovery plan should cause no snapshot change.

Acceptance claims are process-local. The launch-marker bounds apply to requests sharing one `CanonicalSyntaxWorkerHost`; no test or documentation may claim that this plan limits the simultaneous first worker launches of separate CLI or LSP processes.

The ordinary `pnpm check` command must pass under Node 24.18.0 and a supported Node 22 runtime with only the existing opt-in performance skip. Record actual files, tests, skips, and durations in this plan. Package smoke must pass from a clean consumer installation, print the current CLI version, accept a known-good Flowchart, and show no unsupported package import surface.

## Idempotence and Recovery

All source and test edits are ordinary patch changes and are safe to repeat. Build output under `dist/` is generated and may be rebuilt; never edit it manually or emit JavaScript beside TypeScript source. Temporary worker markers belong under test-created temporary directories and must be removed in `finally` or test cleanup.

Do not test suppression with a real five-second sleep. If a timing test flakes, inject the monotonic clock and inspect launch markers and state transitions. Do not compensate by increasing Vitest's 20-second test timeout, the product's 10-second deadlines, or test retries.

If startup and request phase cannot be added without widening a public Finding or package interface, stop and revise the internal type design. Canonical Syntax Outcome is repository-private, so no public widening should be necessary.

If queued requests receive the triggering request's private `debugDetail`, fix the suppression-outcome constructor to discard it. Do not expose or snapshot raw worker stderr as user diagnostics.

If terminal streaming changes output order, duplicates diagnostics, or breaks JSON atomicity, retain the old aggregation for the affected mode and narrow streaming to ordinary terminal mode only. Never stream fragments of JSON.

If a successful syntax error does not reset recovery, correct the engine-responsive predicate. Syntax-invalid input is not evidence of unhealthy parser infrastructure.

If the first request after suppression fails, apply the same ordinary startup/request rules and the same fixed 5,000 ms interval; do not add a separate probe worker or hidden synthetic diagram. If field evidence later shows that repeated intervals require escalation or a different duration, create or revise a separate living plan before changing policy.

If implementation evidence shows that only startup duration needs a different deadline, finish this plan with phase observability and bounded restart behavior first. Plan a separate measured startup-deadline change; do not silently widen it here.

Preserve unrelated worktree changes. Never use `git reset`, `git checkout --`, `git clean`, broad deletion, or a lockfile rewrite as recovery. Do not stage or commit without a separate user request.

## Artifacts and Notes

Planning-time worktree:

    ## main...origin/main
     M README.md
    ?? docs/performance/2026-07-23-modern-agent-scan.md

Reopened-review worktree additionally contains the user-owned untracked timeout-recovery and local-metrics ExecPlans. Preserve both; this review edits their agreed planning semantics but does not stage them.

Planning-time runtime and package surface:

    default Node  v22.20.0
    pnpm          10.30.1
    package       mermaid-validator 0.3.2
    Mermaid       11.16.0
    JSDOM         26.1.0
    deadlines     startup 10000ms; request 10000ms

Motivating external scan evidence collected before this plan:

    first unchanged page run   system/parser-timeout after 10000ms, exit 3
    same page retry            passed in 6.8s
    direct same-source parse   accepted in about 4.0s
    full unchanged wiki scan   passed in 7.8s
    affected existing pages   16 pages containing Mermaid blocks

The incident research also recorded 16 page-level validator invocations overlapping later in the task. That cross-process pressure is a separate shape from one host restarting per diagram: this plan bounds only the latter and the later metrics plan measures the former.

The exact timeout phase is unknown for that historical run because current messages collapse both timers. This plan must not rewrite that uncertainty as a proven startup timeout.

Expected focused behavior after implementation, using injected short deadlines and a fake clock rather than production waits:

    startup outage
      launches                    1
      original startup timeouts   1
      immediate suppressed        7

    request outage
      timed-out worker requests   2
      later worker launches       0 before suppression.until

    recovery
      suppression interval        5000 ms on every opening
      escalation state            none

Focused baseline after reopened design review:

    RUN  v4.1.10
    Test Files  3 passed (3)
    Tests       32 passed (32)
    Duration    5.84s

Replace these expected summaries with exact test names and transcripts as implementation proceeds.

## Interfaces and Dependencies

No dependency changes. Keep exact-pinned Commander 15.0.0, Globby 16.2.2, JSDOM 26.1.0, Mermaid 11.16.0, mdast-util-from-markdown 2.0.3, Zod 4.4.3, and all current development-only tools. Add no browser, renderer, geometry, image, vision, retry, queue, or circuit-breaker package.

In `src/validation/canonical-syntax/protocol.ts`, refine `EngineFailure` and `SyntaxOutcome` so timeout phase is required only for actual timeout failures and suppression is a separate internal result. The final internal shape should be equivalent to:

    export type TimeoutPhase = "startup" | "request"
    export type EngineFailure =
      | "initialization"
      | "timeout"
      | "runtime"
      | "crash"
      | "protocol"
      | "restart-suppressed"
    export type StartupFailure = "initialization" | "timeout" | "crash" | "protocol"
    export type RestartSuppressionCause =
      | { kind: "startup-failure"; failure: StartupFailure }
      | { kind: "consecutive-request-timeouts" }

    export type WorkerSyntaxOutcome =
      | AcceptedOutcome
      | SyntaxErrorOutcome
      | UnsupportedTypeOutcome
      | {
          kind: "engine-failure"
          failure: Exclude<EngineFailure, "timeout" | "restart-suppressed">
          message: string
        }
    export type HostEngineFailureOutcome = {
      kind: "engine-failure"
      failure: Exclude<EngineFailure, "timeout" | "restart-suppressed">
      message: string
      debugDetail?: string
    }
    export type TimeoutOutcome = {
      kind: "engine-failure"
      failure: "timeout"
      phase: TimeoutPhase
      message: string
      debugDetail?: string
    }
    export type RestartSuppressedOutcome = {
      kind: "engine-failure"
      failure: "restart-suppressed"
      cause: RestartSuppressionCause
      message: string
    }
    export type SyntaxOutcome =
      | Exclude<WorkerSyntaxOutcome, { kind: "engine-failure" }>
      | HostEngineFailureOutcome
      | TimeoutOutcome
      | RestartSuppressedOutcome

The exact aliases may differ if a clearer discriminated union preserves the same invariants. The response branch of `WorkerMessage` must carry `WorkerSyntaxOutcome`, not the wider host-level `SyntaxOutcome`, and its runtime guard must reject worker-supplied timeout, suppression, or `debugDetail` values. Only the parent host can attach bounded stderr as `debugDetail`, produce `TimeoutOutcome` when one of its timers fires, or produce `RestartSuppressedOutcome` after applying recovery policy. All IPC remains JSON-serializable. `src/validation/canonical-syntax/index.ts` may continue exporting the wider `SyntaxOutcome` to root Diagram Validation, but `src/validation/index.ts` must not expose it to delivery adapters.

In `src/validation/canonical-syntax/worker-host.ts`, keep `CanonicalSyntaxWorkerHost` internal and extend only its internal options:

    export interface WorkerHostOptions {
      readonly workerPath?: string
      readonly startupTimeoutMs?: number
      readonly requestTimeoutMs?: number
      readonly restartSuppressionMs?: number
      readonly now?: () => number
    }

Validate `restartSuppressionMs` as a finite positive number. During construction, call the selected `now()` once and synchronously reject a thrown or non-finite initial reading with a project-owned message. Document finite, nondecreasing later readings as the internal injection contract; do not add a clock-failure mode, asynchronous throw path, or user-visible diagnostic for a test double that later violates it. Do not add a public CLI flag, config field, environment variable, JSON field, or LSP option.

Keep `requestCanonicalSyntax(source, signal)` and `checkCanonicalSyntax(source, options)` signatures unchanged. Keep `validateDocument()` and every public `Finding` field unchanged while extending the built-in code set with `system/parser-restart-suppressed`. The CLI and LSP must remain unaware of timeout phase and structured suppression cause except through the stable Finding code and human-readable message.

The module graph stays:

    CLI and LSP delivery adapters
      -> src/validation/index.ts
      -> root Diagram Validation
      -> src/validation/canonical-syntax/index.ts
      -> worker-host.ts / worker-entry.ts / mermaid-runtime.ts
      -> exact-pinned official Mermaid and JSDOM

No reverse edge or sideways delivery-adapter edge is permitted. Compatibility Evidence may observe Diagram Validation but product modules may not import Compatibility Evidence. `mermaid-runtime.ts` remains the only product owner of Mermaid and JSDOM imports. No ADR is required unless implementation evidence changes those ownership or dependency-direction decisions.

## Revision Note

2026-08-06: Created this standalone post-Stage-4 hardening ExecPlan after a real external wiki scan exposed repeated canonical-worker timeouts and after the user and Codex refined the runtime model. The plan distinguishes startup from request timeout, preserves both 10-second deadlines and no-retry semantics, adds starts-allowed versus starts-suppressed host policy with one request-timeout grace and demand-driven 5/10/20/30-second backoff, streams ordinary terminal diagnostics without changing JSON, and keeps official Mermaid, architecture, dependencies, Stage 5 status, visual deferral, and publication scope unchanged.

2026-08-06: Reopened design review and made `restart-suppressed` a distinct internal Syntax Outcome with a structured suppression cause. This prevents a request that never launched a worker from falsely carrying a timeout phase or replaying the triggering failure as its own outcome.

2026-08-06: Added the public `system/parser-restart-suppressed` Finding code for the distinct suppressed outcome. Existing actual timeout codes remain unchanged, JSON stays at schema version 2 because its shape does not change, and suppressed validation remains a system error with exit class 3.

2026-08-06: Kept post-ready runtime, crash, and protocol failures outside the suppression streak. Their current fresh-worker recovery can theoretically repeat launches, but no field incident establishes that problem; this plan follows the Stage 2 evidence threshold and records the unbounded non-timeout path as a residual risk.

2026-08-06: Defined request-timeout consecutiveness over actual parser attempts. Only cancellation after a request was sent to a ready worker breaks the streak; cancelling queued, startup-waiting, or suppression-time work cannot hide two adjacent timeout attempts.

2026-08-06: Kept suppression expiry deliberately simple and cause-independent. Every expiry resets the request-timeout streak to zero; persistent request outages may use two new request deadlines per recovery interval before the fixed suppression interval reopens.

2026-08-06: Kept the injected-clock seam minimal. The host validates one initial reading synchronously, while later finite monotonic behavior is the test double's contract; no product recovery state exists for a deliberately corrupted internal clock.

2026-08-06: Replaced exponential 5/10/20/30-second restart backoff with one fixed 5,000 ms demand-driven suppression interval. The observed scan needs bounded launches, while escalation across repeated long-lived recovery intervals has no field evidence and will wait for metrics.

2026-08-06: Confirmed document-at-a-time streaming for ordinary non-fix terminal output. Completed runs retain identical ordered bytes; interrupted runs may keep diagnostics already written for completed documents. JSON and both fix modes remain aggregated and atomic on stdout.

2026-08-06: Fixed non-fix read-error timing around streaming. All known sorted read failures now write to stderr before validation starts; terminal diagnostics follow per completed document, JSON stdout remains atomic, and fix modes retain combined read/write-error aggregation.

2026-08-06: Reconfirmed both 10,000 ms parser deadlines. The historical timeout phase is unknowable and the available successful samples do not justify changing either limit; phase-specific metrics must precede a separate deadline decision.

2026-08-06: Made the recovery boundary explicitly process-local. One host bounds its own repeated worker launches, but concurrent CLI/LSP processes may each start an initial worker; shared process coordination remains outside this plan pending overlap metrics and a separate design.

2026-08-06: Fixed five public suppression messages for startup timeout, startup initialization failure, startup process crash, startup protocol failure, and consecutive request timeouts. Messages omit interval and remaining-time text so one cached outcome remains truthful until expiry.
