# Deliver the Stage 4 LSP adapter

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` controls Stage 4 scope and exit criteria, `ARCHITECTURE.md` controls module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes official Mermaid as the sole canonical syntax authority. The completed predecessor is `docs/plans/stage-3-custom-rules-and-fixes.md`. This plan repeats the relevant contracts so that a contributor can execute it from this file and the current working tree without relying on prior conversation or agent memory.

## Purpose / Big Picture

After Stage 4, an editor or coding agent that speaks the Language Server Protocol (LSP) can start `node dist/lsp/main.js --stdio`, open an unsaved Mermaid or Markdown buffer, and receive versioned diagnostics produced by the same in-memory Diagram Validation operation as the CLI. Changes are debounced, older validation is cancelled, late results are discarded, and closing a document clears its diagnostics. Findings continue to use official Mermaid for canonical syntax and the Stage 3 rule selection for lint behavior.

When the client supports literal Code Actions, explicitly lists `quickfix` in its supported Code Action kind value set, and supports versioned document changes, a fixable diagnostic offers one Quick Fix titled `Apply all safe Mermaid fixes in this document`. The server obtains that action from `planDocumentFixes()` against the current buffer; it does not expose raw candidate edits directly. The returned workspace edit carries the current document version, so an edit planned for an older buffer cannot silently apply to newer text. The server never writes an open document or asks the CLI to do so.

Stage 4 also establishes the right performance model for editor use. The language server remains alive across changes and therefore reuses the serialized canonical worker after a successful request. A repository-owned LSP process harness records first-diagnostic and subsequent-change latency separately, including median and range, without turning a workstation snapshot into a CI timing threshold. Debounce, cancellation, version rejection, and one long-lived process are acceptance requirements; speculative caches, a daemon, multiple Mermaid workers, or a Markdown parser rewrite are not.

This stage creates only the LSP delivery adapter and its tests and documentation. It does not add Semantic Facts, `facts` rule prerequisites, user-visible skip metadata, new semantic rules, dynamic rule plugins, package-level programmatic exports, SARIF, JUnit, GitHub Actions, MCP, MDX, rendering, images, geometry, layout comparison, vision providers, or a configurable noncanonical fast mode.

## Progress

- [x] (2026-07-26 16:11Z) Read `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 3 ExecPlan, the current validation/CLI/config contracts, the canonical worker lifecycle, architecture checks, package manifest, and the existing performance snapshot.
- [x] (2026-07-26 16:11Z) Verified the planning baseline on Node 22.20.0 and pnpm 10.30.1: `pnpm check` passed 23 test files and 190 tests; `pnpm compatibility` passed 4 files and 16 tests with 27 fixtures and 108 observations.
- [x] (2026-07-26 16:11Z) Queried the npm registry and upstream Microsoft materials without installing packages. The current exact candidates are `vscode-languageserver@10.1.0` and `vscode-languageserver-textdocument@1.0.12`; the server package owns exact transitive `vscode-languageserver-protocol@3.18.2` and exposes its Node implementation through `vscode-languageserver/node`.
- [x] (2026-07-26 16:11Z) Drafted the complete Stage 4 boundary, scheduling state machine, diagnostic projection, initialization options, safe Code Action policy, process-level tests, performance characterization, dependencies, and acceptance behavior in this ExecPlan.
- [x] (2026-07-26 16:27Z) Completed an independent design-intent and contract review. Tightened immutable snapshot/cache ownership, publication races, CLI/LSP parity, invalid-params construction, capability negotiation, shutdown semantics, process-test determinism, and the performance clock before implementation.
- [x] (2026-07-26 18:52Z) Completed a 29-branch, one-question-at-a-time design grilling with the user. Confirmed every existing load-bearing branch and closed previously unstated URI-scheme, Code Action diagnostic-scope, minimal Diagnostic projection, process-harness, non-monotonic-version, and exact initialize-capability decisions. The Stage 4 scope is locked and ready for implementation.
- [x] (2026-07-26 18:59Z) Established the implementation baseline at commit `f1a9e30` on Node 22.20.0/pnpm 10.30.1. `pnpm check` passed and `pnpm compatibility` remained 4 files/16 tests over 27 fixtures/108 observations; the unrelated README and performance note remain untouched.
- [x] (2026-07-26 18:59Z) Implemented Milestone 1: exact runtime pins `vscode-languageserver@10.1.0` and `vscode-languageserver-textdocument@1.0.12`, transitive protocol `3.18.2`, Stage 4 LSP import/ownership tests, and the active LSP architecture snapshot. The focused architecture suite passes 4 files/32 tests.
- [x] (2026-07-26 19:03Z) Implemented Milestone 2: strict private initialization/transport parsing, defensive UTF-16 Diagnostic/edit projection, and an immutable notification-time, per-URI version/generation scheduler with deterministic cancellation/publication-race tests.
- [x] (2026-07-26 19:06Z) Implemented Milestone 3: the guarded stdio entry, exact initialize surface, official incremental text store, supported/unsupported language handling, opaque URI ownership, versioned push diagnostics, close cleanup, and official shutdown/exit behavior.
- [x] (2026-07-26 19:07Z) Implemented Milestone 4: capability-gated, contextual `quickfix` handling that replans the complete current buffer, rejects every stale/refused/cancelled plan, and returns one versioned planner-approved `TextDocumentEdit` without applying it.
- [x] (2026-07-26 19:10Z) Implemented Milestone 5: repository-owned split-frame stdio client, built-process lifecycle/buffer/range/Quick Fix tests, CLI/LSP parity under default and error rules, deterministic worker-reuse evidence, and opt-in cold/warm characterization.
- [x] (2026-07-26 19:25Z) Implemented Milestone 6: language-server documentation, isolated README additions preserving the earlier performance link, private version `0.3.0`, finalized architecture/roadmap evidence, and frozen Node 22.20.0/24.18.0 gates. Stage 5 remains absent.
- [x] (2026-07-26 19:37Z) Completed the required independent read-only implementation review and resolved every finding: ignored planner cancellation, rejected diagnostic publications, field-level null options, unbounded invalid-params messages, and a stale revision sentence. Regression tests raise the final dual-runtime gate to 29 files/242 tests plus 4 compatibility files/16 tests over 27 fixtures/108 observations.
- [x] (2026-07-27 17:40Z) Re-reviewed the integrated worktree against this plan and interviewed the user on every high-priority branch. The current Node 22.20.0 `pnpm check` passes 242 tests with one opt-in skip and both runtimes pass the 27-fixture/108-observation compatibility gate, but a fresh Node 24.18.0 full gate produced three canonical parser timeouts under file-level test concurrency. The three affected files pass 51/51 when rerun alone but take 96.82 seconds, so the earlier Stage 4 closeout is reopened.
- [ ] Implement Milestone 7 correctness hardening: negotiate actual `quickfix` kind support, complete the planner and process-level acceptance matrices, close the bare Node builtin architecture-check loophole, and repair every Stage 4 status/version/evidence surface without changing canonical parser timeouts or test concurrency.
- [ ] After Milestone 7 is green, stop with Stage 4 marked “implementation complete; closeout blocked.” Author and review a standalone performance ExecPlan for Node 24 test-process contention; do not perform that performance work in this plan. Stage 4 may close only after the separate plan proves three consecutive Node 24 full gates and one Node 22 full gate without increasing the 10-second product parser deadline or removing real process tests.

## Surprises & Discoveries

- Observation: The current canonical worker is already a module-level singleton and is reused after successful requests, but cancelling an active request intentionally discards and kills that worker.
  Evidence: `src/validation/canonical-syntax/worker-host.ts` constructs one `defaultHost`; `requestCanonicalSyntax()` delegates to it; `CanonicalSyntaxWorkerHost.#abort()` kills the active worker because official Mermaid parsing is not cooperatively cancellable.

- Observation: The current validation contract already contains the three pieces Stage 4 needs for race safety: `DocumentSnapshot.version`, `ValidateOptions.signal`, and host-document UTF-16 `Finding.span`/`TextEdit.span` values.
  Evidence: `src/validation/document.ts` and `src/validation/findings.ts` expose these project-owned types through `src/validation/index.ts`; neither exposes Mermaid, JSDOM, Markdown AST, or rule-module values.

- Observation: A Stage 3 Finding's `fixes` are safe candidate ranges, but collection-wide conflict, canonical revalidation, and whole-selection idempotence are proven only by `planDocumentFixes()`.
  Evidence: `src/validation/fix-document.ts` normalizes the complete edit set, revalidates proposed text with official Mermaid, and refuses a result that would produce another safe edit. Returning individual Finding edits directly from LSP would bypass this load-bearing safety contract.

- Observation: The current CLI configuration loader is owned by `src/cli/` and the architecture explicitly forbids LSP from importing another delivery adapter.
  Evidence: `src/cli/config.ts` owns file discovery, config-root matching, and overrides; `ARCHITECTURE.md` permits `src/lsp/**` to import only its own subtree and `src/validation/index.ts`. Stage 4 therefore uses a small private initialization-options rule patch and does not read or watch `mermaid-validator.config.json`.

- Observation: Current full-repository CLI time is stable enough to characterize rather than block Stage 4, while a first canonical request still pays a large fixed startup cost.
  Evidence: On the current 238-document, 22-diagram `modern-agent` worktree, three fresh Stage 3 JSON runs took 6.614, 4.514, and 4.278 seconds, median 4.514 seconds. The dated Stage 2 snapshot measured a one-diagram fresh process at 3.04–4.06 seconds and a zero-diagram file at 0.21–0.49 seconds. These are environment-specific observations, not an SLA.

- Observation: The current registry metadata differs from the older Stage 4 placeholder versions implied by repository age.
  Evidence: On 2026-07-27, `pnpm view` returned `vscode-languageserver` `10.1.0` and `vscode-languageserver-textdocument` `1.0.12`. Package metadata shows the server depends on protocol `3.18.2` and uses conditional exports; the repository's existing `NodeNext` TypeScript configuration is the compatible import model.

- Observation: The official `TextDocument` held by `TextDocuments` is a mutable live object, so retaining it in accepted scheduler state would let a later edit silently mutate the coordinate basis for an earlier result.
  Evidence: Independent review traced the planned cache through scheduling, diagnostic publication, and Code Action projection. Stage 4 must copy URI, language id, text, and version at notification time and recreate a snapshot-specific `TextDocument` only for offset projection.

- Observation: The pre-existing `README.md` change is an isolated two-line Stage 2 performance-reference addition at the end of the development-evidence section, so Stage 4 documentation can be added without overwriting or rewriting that user change.
  Evidence: `git diff -- README.md` shows only the dated performance-snapshot link and its blank separator as added lines. Stage 4 must preserve them exactly while updating the introduction, private built command, and reference links.

- Observation: Running the focused TypeScript check through RTK's normal filtered path can emit JavaScript and source maps beside TypeScript sources even though the configured test project is no-emit.
  Evidence: The first Milestone 1 `rtk pnpm typecheck` created only untracked `.js`/`.js.map` artifacts under `src/`, `tests/`, `fixtures/`, and `vitest.config`; they were removed immediately. Subsequent TypeScript gates use `rtk proxy pnpm typecheck`, matching the review-hardened Stage 3 recovery path.

- Observation: Expanding the built-process suite increases child-process startup contention enough that the existing test-only 500 ms worker-start deadline can flake under the full Node 24 matrix even though the same worker-host file passes alone in 2.2 seconds.
  Evidence: The first Node 24 full gate failed only the delayed-ready cancellation fixture; an immediate isolated rerun passed all 11 worker-host tests. Raising only the injected test-fixture startup budget to 2,000 ms allowed the implementation-time 29-file gate to pass without changing the product's 10-second canonical worker deadline, but the later re-review below proves that this was not a durable full-suite fix.

- Observation: AbortSignal propagation and a bounded logger are insufficient when an injected dependency ignores cancellation or the protocol transport itself rejects.
  Evidence: Independent read-only review reproduced a cancelled Code Action returning an edit from an ignored signal and an always-rejecting diagnostic publisher producing `unhandledRejection`. The final adapter rechecks the controller after planning and contains both normal/clearing/close publication rejections; focused regression tests cover each branch.

- Observation: The current Quick Fix capability check treats the mere presence of `codeActionLiteralSupport` as support for `quickfix`, even when the client's declared `codeActionKind.valueSet` contains only another kind such as `refactor`.
  Evidence: `src/lsp/server.ts` checks only that literal support exists and `workspaceEdit.documentChanges` is true. The protocol capability's value set is the client's explicit list of supported literal kinds, so advertising and returning `quickfix` outside that set violates the intended capability gate.

- Observation: The current internal Code Action tests do not implement the safety matrix already required by Milestone 4, and the process suite does not prove several Milestone 5 lifecycle and projection claims.
  Evidence: `tests/internal/lsp/server.test.ts` injects only `changed`, `unchanged`, and an ignored-cancellation planner. It does not cover the other four `DocumentFixStatus` values, change/close during planning, malformed edits, or multi-edit/multi-diagnostic scope. `tests/integration/lsp/lsp.test.ts` waits for version 2 without proving version 1 was never published, lacks a real-process Unicode and parser/system Finding case, and `StdioLspClient.shutdown()` discards the exit status instead of asserting zero.

- Observation: The architecture check rejects only `node:`-prefixed filesystem/path/child-process specifiers from `src/lsp/**`.
  Evidence: `import "fs/promises"`, `import "path"`, or `import "child_process"` is a valid equivalent Node builtin edge but does not match the current regular expression. Normalizing an optional `node:` prefix before checking closes the loophole without adding a dependency.

- Observation: A fresh Node 24.18.0 full gate can turn valid Mermaid inputs into `system/parser-timeout` while the same affected files pass when isolated.
  Evidence: The re-review's default `pnpm check` failed three tests across `rules-and-fixes.test.ts`, `validate-document.test.ts`, and `cli.test.ts` at the unchanged 10-second product deadline; the isolated three-file rerun passed 51/51 in 96.82 seconds. Node 22 remained green and Node 24 compatibility passed 16/16. This is a test-process contention blocker, not evidence that the parser deadline should be increased, and it belongs in a standalone performance plan.

## Decision Log

- Decision: Create `src/lsp/` as a delivery adapter that imports product behavior only from `src/validation/index.ts`; do not move validation, Markdown mapping, rules, or fix planning into the LSP module.
  Rationale: CLI and LSP must translate different transports around the same in-memory domain operation. A sideways CLI call, deep validation import, or duplicate parser would make results diverge and violate the accepted architecture.
  Date/Author: 2026-07-27 / Codex.

- Decision: Exact-pin `vscode-languageserver@10.1.0` and `vscode-languageserver-textdocument@1.0.12` as runtime dependencies. Import the server from `vscode-languageserver/node`; do not add a direct protocol or JSON-RPC dependency unless implementation evidence proves the official server export insufficient.
  Rationale: These are the current official stable registry versions and the server already owns exact protocol `3.18.2`. Keeping protocol and transport implementation behind the server package avoids an unnecessary direct dependency and matches the upstream conditional-export model.
  Date/Author: 2026-07-27 / Codex.

- Decision: Add a private built entry and package bin named `mermaid-validator-language-server` at `dist/lsp/main.js`, exercised in Stage 4 through `node dist/lsp/main.js --stdio` rather than an installed-package claim.
  Rationale: The roadmap requires a standalone stdio language server, while Stage 6 owns installed-package consumer tests, publication, declarations, exports, and public compatibility promises.
  Date/Author: 2026-07-27 / Codex.

- Decision: Support only stdio transport in the Stage 4 product contract. Reject a missing transport or socket, pipe, and Node IPC requests with a bounded stderr message before protocol output begins.
  Rationale: One transport is sufficient for editor and agent integration, produces a deterministic process test surface, and avoids promising lifecycle behavior that the roadmap does not require. stdout must remain exclusively LSP-framed messages.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Return an exact minimal initialize surface: `serverInfo`, UTF-16 position encoding, open/close incremental text synchronization, and capability-gated `quickfix` Code Actions. Do not tolerate or snapshot unrelated additional advertised providers.
  Rationale: Every advertised capability creates a client expectation. Completion, hover, formatting, pull/workspace diagnostics, execute-command, watching, configuration, semantic tokens, and later features have no Stage 4 handlers or acceptance contract; adding one requires a deliberate plan revision.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Use LSP push diagnostics through `textDocument/publishDiagnostics`, incremental text synchronization, and exact language identifiers `mermaid` and `markdown`. Unsupported language identifiers receive an empty diagnostic publication and no validation or Code Action.
  Rationale: Stage 4 explicitly requires diagnostics on unsaved changes. The official text-document helper maintains the current in-memory buffer under incremental changes. MDX and alternate language-id aliases have no accepted fixture contract and remain out of scope.
  Date/Author: 2026-07-27 / User and Codex (language identifiers confirmed during design review).

- Decision: For supported language identifiers, treat the document URI as an opaque identity string and accept every URI scheme. Do not parse a URI into a path or allowlist `file:` and `untitled:`.
  Rationale: Open-buffer text is authoritative and Diagram Validation requires only a stable URI string. Virtual documents used by editors and coding agents need no filesystem semantics, so a scheme restriction would reduce compatibility without adding safety.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Negotiate and advertise UTF-16 positions explicitly. Convert host offsets with the current `TextDocument.positionAt()` implementation and never count Unicode code points manually.
  Rationale: Diagram Validation already defines absolute UTF-16 host offsets, JavaScript string indexing uses UTF-16 code units, and LSP positions are zero-based. Explicit UTF-16 preserves surrogate-pair behavior and avoids a second coordinate model.
  Date/Author: 2026-07-27 / Codex.

- Decision: Project each Finding to an LSP Diagnostic with the same `code` and `message`, severity mapping error/warning/info to LSP 1/2/3, and `source: "mermaid-validator"`. A bounded Finding span becomes its exact range; a locationless document-level Finding uses the zero-width range at line 0, character 0.
  Rationale: LSP requires a range even when official Mermaid supplies no location. Highlighting the entire document would be visually noisy, while an origin anchor preserves the Finding's document-level precision without inventing a token location. Stage 4 does not append `help` to the message or project `diagramType`, `engine`, `locationPrecision`, or candidate fixes into protocol metadata; those values have no accepted stable LSP UI mapping, and fixes remain available through the separately planned Code Action.
  Date/Author: 2026-07-27 / User and Codex (minimal projection, source, and document-level behavior confirmed during design review).

- Decision: Debounce each URI for 150 ms by default. A newer version clears a pending timer, aborts an active validation through its `AbortSignal`, and advances a monotonically increasing generation. A result may publish only when URI, document version, and generation still match the open buffer.
  Rationale: Debounce avoids starting canonical work for every keystroke, cancellation bounds stale work, and the final triple check protects against a dependency that completes after cancellation. Active cancellation may restart the canonical worker; correctness takes priority, and the performance harness records that cost rather than hiding it.
  Date/Author: 2026-07-27 / User and Codex (default, range, and active-abort policy confirmed during design review).

- Decision: Assume protocol-conforming clients send monotonically increasing document versions. Use scheduler generations and version checks to reject asynchronous stale results, but do not replace the official text-document store or invent recovery for duplicate/decreasing `didChange` versions.
  Rationale: The official store has already applied a notification before change listeners run. Recovering a malformed client stream would require a second document model and undefined rollback semantics, while valid streams already receive complete stale-result protection.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Accept one private, strict `initializationOptions` object with optional `debounceMs` and optional base `rules`. Omitted options and explicit `null` both mean defaults, as common generic LSP clients send either form. `debounceMs` must be a safe integer from 0 through 2,000. `rules` uses the same raw rule-map grammar as the CLI base patch and is resolved through `resolveRuleConfigurationPatch()` and `materializeRuleConfiguration()`. Unknown fields or invalid values fail `initialize` with bounded JSON-RPC invalid-params error `-32602`.
  Rationale: This gives LSP clients useful global severity/option control without importing CLI, rereading workspace files, inventing multi-root override precedence, or stabilizing a public config protocol. Treating null like absence preserves generic-client interoperability. A zero debounce supports deterministic process tests. The private shape may evolve through Stage 5 and is stabilized only in Stage 6.
  Date/Author: 2026-07-27 / User and Codex (strict failure behavior confirmed during design review).

- Decision: Do not read, discover, or watch `mermaid-validator.config.json` in Stage 4. Do not implement `workspace/configuration` or `workspace/didChangeConfiguration`; changing private initialization options requires a server restart.
  Rationale: Reusing CLI config would require a forbidden delivery-adapter import or a new shared filesystem configuration module with unresolved multi-root, untitled-URI, watch, and precedence contracts. The Stage 4 exit criteria require buffer diagnostics and quick fixes, not dynamic workspace configuration. Stage 6 is the accepted configuration-hardening point.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Use canonical mode only. Do not add the roadmap's optional fast mode during Stage 4.
  Rationale: No current adapter has a project-owned provenance contract that can label a noncanonical verdict safely. Official Mermaid remains the only syntax authority; a fast mode can be planned later only with explicit UI labeling and fixtures.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Cache only immutable primitives and project-owned values for the latest accepted URI/version/generation; never retain the mutable live `TextDocument`. Every newer schedule invalidates the prior accepted cache immediately. Diagnostic publication is awaited, then URI/version/generation are checked again before the new cache becomes visible. On close, cancel pending/active work, delete cached state, and publish an empty diagnostic array. Unexpected non-abort failures log only a bounded fixed message to stderr, clear diagnostics for the current version, and keep the server alive.
  Rationale: The server must never let a later mutation change the text used to interpret an earlier result, let a change during `sendDiagnostics` install stale cache, or leave stale diagnostics visible after a close or internal delivery failure. stdout cannot contain unframed logs, and raw stacks or upstream error values must not escape.
  Date/Author: 2026-07-27 / User and Codex (unexpected-failure behavior confirmed during design review).

- Decision: Register the Code Action handler unconditionally before `listen()`, but advertise the provider only when the client supports literal Code Actions and `workspace.workspaceEdit.documentChanges`. The handler returns an empty array when those capabilities are absent. Build one `quickfix` action from a fresh `planDocumentFixes()` call over the current buffer, include every current cached fixable Diagnostic in the action after at least one request-context match, and return all accepted edits as one versioned `TextDocumentEdit`; omit `isPreferred` in Stage 4.
  Rationale: Handler registration must not depend on initialization-time state or move after the server begins listening. A versioned edit is the protocol-level stale-write guard. One document-wide action matches the safety unit proven by the planner; splitting candidate edits per Finding would bypass conflict, canonical, and idempotence checks. Listing all current fixable Diagnostics makes the action metadata agree with its accepted document-wide edit scope, while requiring one context match keeps the action contextual. Omitting `isPreferred` avoids claiming a client capability that Stage 4 does not otherwise negotiate. Clients without the required capabilities still receive diagnostics.
  Date/Author: 2026-07-27 / User and Codex (`quickfix` kind, document-wide diagnostic/edit scope, and omission of `isPreferred` confirmed during design review).

- Decision: Recheck the open document version after asynchronous fix planning and return no action for `unchanged`, `conflict`, `invalid`, `unsafe`, `non-idempotent`, cancellation, a closed document, or a changed version. The server never sends `workspace/applyEdit` and never writes a file.
  Rationale: A Code Action is an offered edit, not evidence that the client applied it. Returning only current, planner-approved edits preserves source-of-truth ownership in the editor and keeps filesystem behavior out of LSP. Stage 4 does not return disabled actions for refused plans because that would add capability negotiation and a user-facing refusal vocabulary without an applicable edit.
  Date/Author: 2026-07-27 / User and Codex (fresh replanning and no-disabled-action behavior confirmed during design review).

- Decision: Test the built stdio server with a small repository-owned framed client under `tests/helpers/lsp/`; do not add `vscode-languageclient` or a VS Code extension/runtime harness in Stage 4.
  Rationale: The stage must prove raw framing, response/notification interleaving, stderr isolation, cancellation, timeouts, and lifecycle cleanup. A full editor client would add a second adapter stack and could hide the transport defects this process boundary is meant to expose.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Prove active cancellation and stale-publication interleavings in deterministic scheduler tests with injected timers, validators, publishers, and live-version changes. Process tests prove observable newest-version behavior but do not rely on forcing a validation to be active at a workstation-dependent instant.
  Rationale: The internal seam can exercise validators that honor or ignore cancellation and publishers that remain pending, while a real Mermaid process race would be timing-sensitive and difficult to reproduce. Both levels remain necessary for different evidence.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Characterize performance inside the LSP process harness, but set no wall-clock pass/fail budget in Stage 4. Record at least three fresh-process first-diagnostic samples and at least five subsequent-version samples after a successful first validation, with median, range, document size, diagram count, Node version, and commit.
  Rationale: The accepted evidence shows large cold startup and worker reuse, but workstation load and caches make a fixed timing gate flaky. Stage 4 must prove the lifecycle shape and measure it before choosing a later optimization. The milestone-specific samples remain in this living ExecPlan rather than creating a second performance artifact; a dedicated document requires a later maintained benchmark or retest contract.
  Date/Author: 2026-07-27 / User and Codex (measurement and evidence location confirmed during design review).

- Decision: Define CLI/LSP parity as equal findings for identical snapshot text and the same resolved base rule configuration. Compare code, severity, message, and equivalent host offsets/ranges for standalone Mermaid and embedded Markdown; separately assert that every LSP Diagnostic uses adapter source `mermaid-validator`. Do not compare the core Finding source (`mermaid`, `rule`, or `system`) with the LSP adapter source, and do not include CLI per-path overrides or ambient config discovery in the Stage 4 equivalence claim.
  Rationale: Both adapters already share Diagram Validation, but a process-level parity fixture proves that transport projection and private LSP rule initialization preserve the same semantics. CLI override discovery is intentionally outside the LSP configuration contract and cannot be smuggled into the acceptance claim.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Leave the lowercase `mermaid` Markdown prefilter, bounded parallel extraction, multiple canonical workers, persistent daemon/cache, and parser prewarming outside this ExecPlan.
  Rationale: Those changes affect core or CLI behavior and require their own before/after evidence. Stage 4 first creates the warm interactive workload that tells us which optimization is load-bearing. Logical cancellation that allows stale canonical parsing to finish is also excluded because active cancellation was accepted as the current responsiveness contract.
  Date/Author: 2026-07-27 / User and Codex (confirmed during design review).

- Decision: Treat post-planner cancellation as an independent rejection gate even when the injected planner resolves normally, and contain diagnostic publisher rejection at every detached scheduler boundary.
  Rationale: AbortSignal propagation and transport promises are cooperative dependencies. The adapter must still enforce its own no-action-after-cancellation contract and must not turn a failed normal/clearing/close publication into an unhandled rejection that can destabilize the server.
  Date/Author: 2026-07-27 / Codex (independent implementation review resolution).

- Decision: Only the complete `initializationOptions` value may be null. A present field-level null is invalid, and every invalid-params message is capped at 256 characters after project-owned validation.
  Rationale: Optional JSON fields are either absent or grammar-valid; treating null as field absence weakens the strict contract. Bounded responses prevent attacker-controlled option or rule names from producing unbounded protocol output while retaining useful short messages.
  Date/Author: 2026-07-27 / Codex (independent implementation review resolution).

- Decision: Lock Stage 4 at the private built stdio LSP adapter described in this plan. Stop before editor-extension packaging, config-file discovery/watching, dynamic configuration, public exports/declarations/installed-package guarantees, Semantic Facts, new rules, MCP, SARIF, JUnit, GitHub Actions, and every deferred visual capability. Do not stage or commit without a separate request.
  Rationale: Unsaved-buffer diagnostics and planner-backed current-version Quick Fixes complete the accepted Stage 4 outcome. The excluded surfaces have distinct Stage 5/6 or deferred-roadmap contracts and would weaken stage exit criteria if mixed into this implementation.
  Date/Author: 2026-07-27 / User and Codex (final scope lock confirmed during design review).

- Decision: Advance the private package and both built tool version surfaces to `0.3.0` only at Stage 4 closeout.
  Rationale: The roadmap identifies Stage 4 as the internal `v0.3` CLI + LSP release cut. This remains private and does not create package exports, declarations, publication metadata, or a public API promise.
  Date/Author: 2026-07-27 / Codex.

- Decision: Reopen the Stage 4 closeout and describe the current state as “implementation complete; closeout blocked” until correctness hardening is complete and a separate performance plan makes the default dual-runtime gate durable.
  Rationale: A fresh Node 24.18.0 `pnpm check` produced three product-level parser timeout Findings for valid inputs. An isolated rerun passed, so the implementation remains usable evidence, but the current worktree does not satisfy this plan's full-gate exit criterion and must not continue claiming completion.
  Date/Author: 2026-07-28 / User and Codex.

- Decision: Keep the 10-second canonical parser startup/request deadline unchanged and handle Node 24 full-suite resource contention in a standalone performance ExecPlan after correctness hardening.
  Rationale: The affected tests pass in isolation, and the full-suite failure appears only when Vitest file workers and their canonical/CLI/LSP child processes compete. Raising the product deadline would weaken real editor and CLI failure responsiveness while hiding test scheduling pressure. The separate plan must accept three consecutive Node 24 full gates and one Node 22 full gate without skipping real process tests.
  Date/Author: 2026-07-28 / User and Codex.

- Decision: Treat the missing Quick Fix, process-lifecycle, projection, and architecture evidence as Stage 4 correctness work rather than performance work.
  Rationale: These gaps concern protocol capability truth, stale-edit safety, observable process behavior, and enforceable dependency boundaries. Their outcomes do not depend on throughput or wall-clock optimization and can be made deterministic with injected dependencies, notification history, process barriers, and synthetic import edges.
  Date/Author: 2026-07-28 / User and Codex.

- Decision: Enable Quick Fixes only when the client declares literal Code Actions with `quickfix` in `codeActionKind.valueSet` and versioned `workspaceEdit.documentChanges`.
  Rationale: Literal support alone says that the client can receive CodeAction objects; its value set says which action kinds it understands. A client that declares only `refactor` must continue receiving diagnostics but must neither see a `quickfix` provider nor receive Quick Fix results.
  Date/Author: 2026-07-28 / Codex, confirmed by the existing protocol contract.

- Decision: Revert private version surfaces to `0.2.0` while closeout is blocked, then restore the coordinated `0.3.0` bump only after the standalone performance plan satisfies the final runtime matrix.
  Rationale: This plan already reserves `0.3.0` for Milestone 6 closeout. Reopening closeout while retaining the release-cut version would make package, CLI, LSP, JSON reference, roadmap, and tests disagree with the plan's own version policy.
  Date/Author: 2026-07-28 / Codex.

## Outcomes & Retrospective

Planning outcome: complete. This document turns the short Stage 4 roadmap entry into an independently reviewed and user-grilled executable delivery, scheduling, position, configuration, Code Action, lifecycle, performance, and recovery contract. The 29-branch design interview confirmed immutable notification-time snapshots, `planDocumentFixes()` as the Quick Fix safety boundary, private filesystem-free configuration, opaque URI schemes, minimal Diagnostics, document-wide action metadata, a repository-owned framed process harness, exact minimal capabilities, and official Mermaid plus the current Diagram Validation interface as the only product truth. No unresolved load-bearing design branch remains.

Implementation outcome: feature implementation exists, but closeout is reopened and blocked. The private worktree exposes `node dist/lsp/main.js --stdio`; exact `mermaid` and `markdown` open buffers receive versioned diagnostics through Diagram Validation, and the server replans document-wide safe fixes before returning versioned edits. The implementation-time 29-file/242-test and timing records remain useful historical evidence, but the later review found incomplete Quick Fix/process/architecture coverage and reproduced three Node 24 full-suite parser timeouts. Milestone 7 now owns deterministic correctness hardening. A separate performance ExecPlan will own Vitest/canonical/LSP child-process contention while preserving the 10-second product deadline. Until both are complete, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, package/tool versions, and this outcome must say “implementation complete; closeout blocked,” not Stage 4 complete. Stage 5 Semantic Facts, Stage 6 integrations, and every visual capability remain absent.

## Context and Orientation

The repository is one private TypeScript ESM package. `src/validation/` is the Diagram Validation deep module. Its `validateDocument()` operation accepts an immutable Document Snapshot and returns a deterministic Validation Result. `planDocumentFixes()` accepts the same snapshot and options, validates the complete candidate edit set, revalidates proposed text with official Mermaid, and proves whole-selection idempotence. These operations and their project-owned types cross only `src/validation/index.ts`.

A Document Snapshot contains a URI, a `mermaid` or `markdown` language id, the complete text, and an optional integer editor version. A Finding has a stable code, severity, message, source, location precision, optional host-document span, and optional host-document TextEdits. Spans are zero-based, half-open UTF-16 offsets into the exact snapshot text. A Validation Result repeats the document URI and optional version, reports diagram count, and is valid exactly when no Finding has error severity.

`src/validation/canonical-syntax/` owns the serialized worker around exact-pinned `mermaid@11.16.0` and `jsdom@26.1.0`. The worker is lazy and long-lived within a Node process. It processes one request at a time because Mermaid has mutable global state. An active abort kills the child so no stale parse can later respond. Worker initialization, timeout, crash, protocol, and raw Mermaid values never cross the Diagram Validation seam.

`src/validation/markdown/` extracts exact-lowercase `mermaid` CommonMark fences and maps embedded offsets back to the original Markdown buffer. The LSP must pass the entire current Markdown buffer to Diagram Validation and must not extract fences itself. This is how CLI and LSP retain the same list, blockquote, CRLF, Unicode, multiple-block, and EOF-fence behavior.

`src/validation/rules/` owns the repository-private rule registry and Stage 3 built-in rule. A complete `ResolvedRuleConfiguration` may cross `src/validation/index.ts`, but rule modules, Zod, and mutable registries do not. LSP initialization may resolve one base rule patch through the existing project-owned functions; it does not interpret per-file paths or load arbitrary modules.

`src/cli/` remains a separate delivery adapter. It owns command-line config discovery, repository discovery, file reads and atomic writes, terminal output, JSON-v2, and exit codes. LSP must not import it, invoke it, copy its filesystem behavior, or infer current buffer text from disk. An open LSP buffer remains authoritative even when its URI names an existing file with different on-disk contents.

LSP is a JSON-RPC protocol carried here over stdin and stdout. Messages are framed with a `Content-Length` header. The client sends `initialize`, `initialized`, and text-document open/change/close notifications. The server returns capabilities from `initialize`, pushes diagnostics with `textDocument/publishDiagnostics`, and answers `textDocument/codeAction` requests. A push diagnostic carries the buffer version so a client can distinguish results for successive edits. A Code Action is a proposed workspace edit; the client, not the server, decides whether to apply it.

Stage 4 may create this product subtree, with final filename refinements recorded here if ownership stays unchanged:

    src/lsp/
      main.ts
      server.ts
      contracts.ts
      diagnostics.ts
      validation-scheduler.ts

`main.ts` is the shebang entry and transport guard. `server.ts` owns the official LSP connection, initialize/shutdown/exit lifecycle, the official TextDocuments store, and protocol handlers. `contracts.ts` owns private initialization and dependency-injection shapes without re-exporting upstream types outside `src/lsp/`. `diagnostics.ts` converts project Findings and TextEdits into protocol values. `validation-scheduler.ts` owns debounce, generation/version checks, AbortControllers, cached current results, and cleanup. Tests may refine this split if the plan is updated, but no LSP behavior may move into CLI or deep validation internals.

Add internal tests under `tests/internal/lsp/`, process tests under `tests/integration/lsp/`, and a test-only framed client helper under `tests/helpers/lsp/`. The helper is not a product client or a package export. It launches the built server, parses only framed stdout messages, captures stderr separately, sends requests/notifications with deterministic ids, and kills its child in `finally` on test failure.

The planning baseline is commit `a751bb9` on `main`, three commits ahead of `origin/main`. The worktree already contains an unrelated modified `README.md` and the unrelated untracked `docs/performance/2026-07-23-modern-agent-scan.md`; preserve both. Node 22.20.0 and pnpm 10.30.1 are active. `pnpm check` passes 23 files/190 tests, and `pnpm compatibility` passes 4 files/16 tests with 27 fixtures/108 observations. This plan file is the only intended planning change.

## Plan of Work

### Milestone 1: Establish the LSP dependency and architecture boundary

Add exactly `vscode-languageserver@10.1.0` and `vscode-languageserver-textdocument@1.0.12` with pnpm as runtime dependencies. Do not add `vscode-languageclient`, a VS Code extension package, a direct `vscode-languageserver-protocol` or `vscode-jsonrpc` dependency, a command-line framework, a second document model, a glob/config package, or a visual dependency. Confirm the lockfile resolves the server's protocol dependency to `3.18.2` and does not move Mermaid, JSDOM, mdast, Globby, Commander, or Zod pins.

Before product implementation, extend `tests/architecture/module-import-boundaries.test.ts` so `src/lsp/**` may import only its own subtree and `src/validation/index.ts` for project code. It must reject LSP imports of CLI, Compatibility Evidence, Canonical Syntax/Markdown/Rules internals, MCP, fixtures, or tests. Permit `vscode-languageserver` and `vscode-languageserver-textdocument` only under `src/lsp/**`; reject them everywhere else. Reject `node:child_process`, filesystem, and path-discovery imports from LSP because this stage needs none. Continue checking project cycles and every Stage 3 rule/dependency boundary.

After these tests exist and before adding LSP product files, update `ARCHITECTURE.md` from the Stage 3 active tree to the Stage 4 active tree. Change the LSP arrow from future/dotted to active/solid, add the exact `src/lsp/` subtree and LSP-package ownership, and describe open buffers, UTF-16 projection, versioned diagnostics, planner-backed Code Actions, and the lack of sideways adapter calls. The accepted dependency direction does not change, so no ADR is required. If implementation requires a shared CLI/LSP config module, a validation deep import, a second parser, a worker pool, a package split, or a public upstream type crossing the validation seam, stop and write an ADR or revise the plan before proceeding.

At the end of this milestone, exact pins are present, architecture tests fail for every forbidden synthetic LSP edge and pass for `src/lsp/server.ts -> src/validation/index.ts`, and no server behavior or package bin points at a not-yet-created file. Existing Stage 3 behavior and Compatibility Evidence remain green.

### Milestone 2: Implement initialization, projection, and scheduling as testable pure boundaries

In `src/lsp/contracts.ts`, define a strict parser for the private initialization options. Only `debounceMs` and `rules` are accepted. Parse `rules` through `resolveRuleConfigurationPatch()` and `materializeRuleConfiguration()` imported from `src/validation/index.ts`. Return a project-owned success/failure discriminated union with one bounded message; do not expose Zod or raw upstream errors. Absence or explicit null produces debounce 150 ms and built-in rule defaults. The parser must reject arrays, unknown keys, unsafe/fractional/negative values, values above 2,000, unknown rule ids, invalid severities, tuple lengths, or rule options.

In `src/lsp/diagnostics.ts`, implement pure projection functions. Use the official TextDocument's `positionAt()` to convert every bounded host span. Preserve code and message, map severity exactly, set source to `mermaid-validator`, and use `(0,0)–(0,0)` only when the Finding has no span. Reject or downgrade an impossible out-of-bounds span to the document anchor without clamping it to a plausible token. Return a private pair of the original Finding and projected Diagnostic so Code Action matching does not depend on nonstandard diagnostic `data` surviving a client round trip.

In `src/lsp/validation-scheduler.ts`, implement one scheduler object with injected `validateDocument`, diagnostic publisher, timer functions, and bounded logger. The production dependency calls only `validateDocument()` from `src/validation/index.ts`. Each URI owns at most one debounce timer and one active AbortController. At each `schedule(document, rules)` call, synchronously copy URI, language id, complete text, version, and resolved rules into an immutable pending snapshot; never retain the live `TextDocument`. A newer schedule immediately deletes the prior accepted cache, clears the timer, aborts active work, advances generation, and creates a new timer. The timer validates the immutable pending snapshot it owns. `close(uri, version)` cancels everything, deletes cached state, and publishes an empty list. `dispose()` cancels every timer/controller and deletes all state without publishing or closing the protocol connection.

When validation resolves, reconstruct a snapshot-specific official `TextDocument` from the immutable URI/language id/version/text, then project and publish only if the URI is still open and current URI, generation, and live document version equal the captured values. Include that version in `publishDiagnostics` and await the injected publisher. After publication completes, recheck URI, generation, and live version before storing the immutable snapshot, result, projected Finding/Diagnostic pairs, and resolved rules for Code Actions. An AbortError is ordinary stale control flow and produces no log or publication. Any other rejection writes exactly one fixed bounded stderr message, clears current diagnostics if the captured version is still current, and leaves the server usable.

Use fake timers and injected controllable validators in `tests/internal/lsp/validation-scheduler.test.ts`. Prove debounce coalescing, per-URI independence, active AbortSignal propagation, result suppression when a validator ignores cancellation, immediate accepted-cache invalidation, no stale cache mutation, empty close publication, no publication after close/dispose, bounded unexpected-error behavior, and version preservation. Include a mutable same-object fixture whose text/version changes after `schedule()` and prove the scheduled validation still sees its notification-time copy. Include a deferred publisher, change the live document while publication is awaiting, and prove the old result never enters cache. Projection tests cover LF, CRLF, BMP Unicode, a surrogate pair before a Finding, combining characters, exact end-of-document offsets, locationless Findings, all severities, and out-of-bounds defensive handling.

At the end of this milestone, the LSP-specific behavior is testable without a real stdio process or official Mermaid startup. No filesystem reads, connection handlers, or Code Actions exist yet.

### Milestone 3: Wire the standalone stdio server and unsaved-buffer diagnostics

Create `src/lsp/main.ts` with `#!/usr/bin/env node`. Validate transport arguments before creating the connection: the only accepted product invocation is exactly one `--stdio` transport flag plus no unknown arguments. Write usage failures to stderr and set exit `2` without writing stdout. Keep argument parsing as a pure function in `src/lsp/contracts.ts`; `main.ts` is an executable-only file that unconditionally starts the server after parsing and is never imported by unit tests. This avoids filesystem/path imports solely for an entrypoint guard. Now that the built target exists, extend `package.json` with `mermaid-validator-language-server: ./dist/lsp/main.js` while preserving the existing CLI bin. Keep `private: true`, declaration output disabled, and package exports absent. Extend the existing package/bin integration assertion rather than creating an installed-package smoke test.

In `src/lsp/server.ts`, create the Node connection and `TextDocuments<TextDocument>` store using the two official packages. Register all handlers, including Code Action, before `connection.listen()`. During `initialize`, parse the private options, record whether the client supports literal Code Actions and versioned `documentChanges`, and return server info name `mermaid-diagram-validator` with one LSP-owned version constant that matches the package/tool version. It remains `0.2.0` while intermediate milestones run and becomes `0.3.0` only during Milestone 6 closeout. Advertise UTF-16, open/close plus incremental text sync, and Quick Fix only for a capable client. When parsing fails, construct `new ResponseError(ErrorCodes.InvalidParams, boundedMessage)` from `vscode-languageserver/node`; do not throw a generic Error, expose raw values, or add a direct JSON-RPC import. Do not advertise completion, hover, formatting, pull diagnostics, workspace diagnostics, execute-command, file watching, dynamic configuration, semantic tokens, or any later feature.

On open and content change, accept only TextDocument language ids `mermaid` and `markdown`; schedule their current in-memory TextDocument. For every other id, close any prior scheduler state for that URI and publish empty diagnostics. Treat every supported document URI as an opaque identity regardless of scheme. Never call `readFile`, convert a file URI to a path, inspect extension, allowlist schemes, or shell out. On close, publish an empty diagnostic list and discard state. The shutdown request handler disposes scheduler state and responds normally but does not close stdout, call `process.exit()`, or dispose the connection before the response is sent. The official connection lifecycle handles the later `exit` notification: exit status is zero after shutdown and nonzero when exit arrives without shutdown.

Add internal server tests with a fake connection and fake TextDocuments adapter for capability negotiation, invalid initialize options, handler ordering, supported/unsupported language ids, close cleanup, shutdown cleanup, and stdout-safe logging. Add the first process test that launches the built entry, initializes, opens an unsaved `untitled:` Mermaid document, and waits for one versioned rule warning. The process harness must time out with a useful bounded test failure rather than hanging.

At the end of this milestone, a real client can receive current diagnostics for unsaved Mermaid and Markdown text. Rapid pre-debounce changes publish only the newest version. No fix is offered yet.

### Milestone 4: Expose only planner-approved, current-version Quick Fixes

The `textDocument/codeAction` handler is always registered before listening, but it immediately returns an empty array unless initialization recorded both literal Code Action support and versioned document changes. The handler obtains the currently open TextDocument and scheduler cache. If either is absent or their URI/version differ, return an empty array. Match request-context diagnostics against the current projected fixable diagnostics by exact code, message, severity, source, and range; ignore unknown diagnostics and any cache whose URI/version/generation is no longer current. Because request-context diagnostics carry no document version, identical diagnostics from an older version are indistinguishable; the cache/open-version check, fresh replan, and versioned edit are the stale guards.

If at least one current fixable diagnostic matches, create an AbortController bridged to the request's LSP cancellation token and call `planDocumentFixes()` with a fresh snapshot of the open buffer and exactly the cached resolved rules. Do not reuse CLI fix application and do not use cached candidate edits as the output. After planning, dispose the cancellation bridge and re-read the open TextDocument. Return no action unless the plan is `changed`, contains nonempty edits, and URI/version still match the snapshot.

Convert the complete accepted edit list through a snapshot-specific UTF-16 TextDocument. Return one literal Code Action with title `Apply all safe Mermaid fixes in this document`, kind `quickfix`, every current cached fixable Diagnostic in the document, and one `WorkspaceEdit.documentChanges` entry whose text document identifier contains the exact current version. Omit `isPreferred`. Each edit retains the plan's replacement text. Do not send `workspace/applyEdit`, include a command, return proposed full output, or claim the action was applied.

Internal tests inject planners for every `DocumentFixStatus`, cancellation, a planner that ignores cancellation, version changes during planning, close during planning, out-of-bounds defensive edits, multiple non-overlapping edits, multiple current fixable Diagnostics with only one present in the request context, and a capable/incapable client. Contract tests use the real Stage 3 built-in to prove the returned edit deletes only `# ` and that applying the edit in memory yields the planner's proposed output. A conflict or non-idempotent fixture produces diagnostics but no Code Action.

At the end of this milestone, Quick Fix safety is exactly the existing document-level planner safety. The server offers no stale, partial, conflicting, canonically unsafe, or non-idempotent edit.

### Milestone 5: Prove process behavior and characterize interactive performance

Complete `tests/helpers/lsp/stdio-client.ts` and `tests/integration/lsp/lsp.test.ts`. The helper must handle split headers/bodies, multiple messages in one chunk, server notifications interleaved with responses, request ids, timeouts, stderr capture, graceful shutdown, and forced cleanup in `finally`. It must not import private product modules or become a published client.

Process tests must prove: initialize capabilities and server version; stdout framing purity; invalid transport exit `2`; omitted and null initialization defaults; invalid initialization represented by `ResponseError` code `-32602` and a bounded message; default and error-severity rule settings; an unsaved file-URI buffer overriding different disk bytes; an `untitled:` buffer and one custom-scheme virtual buffer validating without path conversion; Markdown host ranges in a list or blockquote; Unicode UTF-16 positions; rapid changes publishing only the last version; close clearing diagnostics; syntax/system Findings remaining bounded; capable-client Quick Fix shape and version; stale Code Action suppression; incapable-client diagnostics without an advertised provider and with an empty handler result; shutdown response followed by exit; and CLI behavior remaining unchanged. The deterministic injected scheduler suite, rather than a timing-sensitive process race, proves that an already active validator is aborted and cannot publish an old result.

Add explicit CLI/LSP parity cases for standalone Mermaid and Markdown. Write one temporary CLI base-rules config and pass the identical raw base `rules` value in LSP initialization, then validate identical source text through both built adapters. Convert LSP ranges back to UTF-16 host offsets with the same fixture text and compare the ordered finding code, severity, message, and offsets; assert the LSP adapter source separately. Run the same comparison once with defaults and once with the built-in rule promoted to error. Do not enable CLI per-path overrides or rely on ambient config discovery in this parity fixture.

Add an opt-in performance characterization around the same process harness. It must be skipped during ordinary `pnpm check` unless `MERMAID_VALIDATOR_LSP_PROFILE=1` is set. For each of three fresh servers, measure first-diagnostic time from sending `didOpen` until receiving the matching versioned diagnostic after initialization completes; optionally report spawn-to-initialize separately, never folded into that clock. For warm samples, use one successfully initialized process and send the next version only after the preceding matching diagnostic arrives. Make at least five no-op incremental replacements that preserve source size and diagram count, using `debounceMs: 0`, so every version validates equivalent work. Report raw samples, median, range, Node/pnpm versions, commit, source size, diagram count, debounce setting, and whether filesystem/OS caches are mixed. Assert only correctness, sample count, and successful completion; do not assert a millisecond ceiling or that warm must always beat cold. Do not infer worker reuse merely from latency; retain or extend the deterministic CanonicalSyntaxWorkerHost test that proves sequential successful requests share one worker instance.

Record the resulting transcript in this plan's `Artifacts and Notes` and `Surprises & Discoveries`. Compare it with the current CLI snapshot only as directional evidence. If the deterministic worker-host launch/state test shows a fresh worker after each successful request, or a process-level rapid-change test violates current-version publication, stop and fix the lifecycle before closeout. Do not infer either condition from latency alone, and do not respond by adding a worker pool, daemon, prewarm API, persistent cache, or core Markdown prefilter inside this milestone.

At the end of this milestone, the built stdio process—not merely pure functions—demonstrates unsaved diagnostics, stale-result rejection, safe current-version Quick Fixes, graceful lifecycle, and measured cold/warm behavior.

### Milestone 6: Document and close Stage 4 without entering Stage 5

Add `docs/reference/language-server.md`. Document the private built command, stdio-only transport, supported language ids, incremental open-buffer ownership, UTF-16 positions, push diagnostics, 150 ms default debounce, strict private initialization options, restart requirement for option changes, capability-gated Quick Fixes, versioned whole-document safe-plan behavior, lack of filesystem writes, lifecycle, and troubleshooting. State explicitly that the package remains private and that editor extensions, config-file discovery/watching, Semantic Facts, public plugins/APIs, MCP, CI formats, and visual features are not present.

Update the existing user-owned `README.md` because the planning-time diff proves the Stage 4 additions can be isolated. Preserve exactly the unrelated two-line Stage 2 performance-snapshot addition and every other unrelated line while updating the introduction, private built LSP command, and language-server reference link. If the README moves before implementation and that isolation no longer holds, leave it unchanged and record the omission here rather than overwriting user work. Do not modify the existing untracked performance snapshot; Stage 4 evidence belongs in this living plan.

Finalize `ARCHITECTURE.md` with implementation-proven filenames and Stage 4 evidence. Update `DRAFT-PLAN.md` only after all gates pass: mark Stage 4 complete with actual date/counts, retain Stages 5–6 as not started, and do not change the deferred visual roadmap. Change package/tool version from `0.2.0` to private `0.3.0` only at closeout. Keep `private: true`, declaration output disabled, package exports absent, and publication/staging/commit outside this task unless separately requested.

Run frozen installs, focused suites, `pnpm check`, and `pnpm compatibility` under Node 22.20.0 and Node 24.18.0. Compatibility Evidence must remain 27 fixtures/108 observations unless a separately reviewed official-canonical change requires an update; LSP fixtures do not belong in that corpus. Record final direct/transitive LSP pins, test counts, representative protocol transcript, timing characterization, dependency list, and every design change in this living plan. Complete `Outcomes & Retrospective`, append a dated Revision Note, and stop before creating Semantic Facts or new rules.

### Milestone 7: Close correctness evidence gaps before performance work

This milestone reopens Stage 4 only for correctness hardening discovered by the post-implementation review. It changes no Mermaid/JSDOM/parser lifecycle, product timeout, debounce policy, file-level test concurrency, dependency, public surface, or later-stage behavior. At the end, protocol capability claims, Quick Fix rejection paths, real-process evidence, and architecture enforcement are complete and deterministic. Stage 4 still remains blocked on the separate Node 24 test-process-contention plan.

First, tighten `supportsCodeActions()` in `src/lsp/server.ts`. A capable client must satisfy all three conditions: `codeActionLiteralSupport` exists, its `codeActionKind.valueSet` contains the exact `quickfix` kind, and `workspace.workspaceEdit.documentChanges` is true. Do not infer Quick Fix support merely because some literal kind is present. A client that lists only `refactor`, omits literal support, or omits versioned document changes receives the same diagnostics but no advertised `codeActionProvider`, and the always-registered handler returns an empty array. Use `CodeActionKind.QuickFix` rather than another string copy.

Expand `tests/internal/lsp/server.test.ts` into the complete planner-safety matrix already promised by Milestone 4. Inject each `DocumentFixStatus`: `unchanged`, `conflict`, `invalid`, `unsafe`, and `non-idempotent` must return no action, while `changed` returns exactly the planner's nonempty edits. Separately prove an AbortError, an unexpected planner rejection with bounded stderr, request cancellation, a planner that ignores cancellation, a document version change during planning, close during planning, an out-of-bounds or zero-width defensive edit, multiple non-overlapping edits, multiple current fixable Diagnostics with only one in the request context, a forged/unknown context Diagnostic, and clients that fail each capability condition. For every refusal, assert an empty action list and no workspace apply request, command, file write, or raw error text. Retain a real built-in rule case that applies returned edits in memory and equals `planDocumentFixes().output`.

Strengthen the raw-process harness in `tests/helpers/lsp/stdio-client.ts` without turning it into a product client. Preserve a complete notification history up to a fixed test-only bound in addition to the current waiter queue; fail explicitly on overflow rather than silently evicting an old publication whose absence a test might later claim. Expose a read-only way for tests to inspect publications after they have been consumed, and make `shutdown()` return the observed child `{ code, signal }` so callers can require code zero. Let the helper launch an explicitly supplied test entry while keeping `dist/lsp/main.js` as the default. Continue handling split frames, multiple frames per chunk, response/notification interleaving, stderr bounds, request timeouts, graceful shutdown, and forced cleanup.

Add one test-only JavaScript entry under `tests/fixtures/lsp/` that creates the same official Node connection and `TextDocuments<TextDocument>` store, imports the built `createLanguageServer()` factory from `dist/lsp/server.js`, and injects a validator returning one bounded project-shaped `system/parser-runtime-failed` Finding. The fixture exists only to exercise system-Finding projection and framing through a real child process; it must not add product flags, environment hooks, exports, or dependencies. `tests/helpers/lsp/stdio-client.ts` itself must still import no private product module.

Extend `tests/integration/lsp/lsp.test.ts` with the process claims missing from Milestone 5. Exercise omitted and whole-value-null initialization defaults separately, and send a long unknown option/rule name to prove the returned `-32602` message is at most 256 characters. Open a canonically valid buffer whose fixable marker follows a surrogate pair and combining mark, convert the returned range back through the same source text, and prove zero-based UTF-16 offsets. Open invalid Mermaid and assert the bounded `mermaid/syntax-error` Diagnostic; launch the injected fixture entry and assert the bounded locationless `system/parser-runtime-failed` Diagnostic at `(0,0)-(0,0)`. For rapid versions, wait for version 2, use the shutdown response and child exit as the process barrier, then inspect complete notification history and assert that no nonempty version-1 publication occurred. Assert graceful shutdown exits with code zero and keep the existing exit-without-shutdown code-one assertion.

Harden `tests/architecture/module-import-boundaries.test.ts` by normalizing an optional `node:` prefix before testing Node builtins. From `src/lsp/**`, reject both forms of `fs`, `fs/promises`, `path`, and `child_process`; add synthetic failures for at least one prefixed and each unprefixed form. Keep the existing positive LSP package and validation-seam examples. Do not add a new lint dependency or weaken unresolved external-package handling.

Finally, repair closeout state rather than rewriting historical evidence. Remove the stale instruction below the recorded protocol/timing transcript. Label commit `f1a9e30` as the base commit for an uncommitted Stage 4 worktree, not as a commit containing the implementation. Update `DRAFT-PLAN.md` and `ARCHITECTURE.md` to “implementation complete; closeout blocked,” retain Stage 5 as not started, and replace unsupported dual-runtime-pass claims with the current Node 22/compatibility successes plus the exact Node 24 failure and isolated-rerun evidence. Because this plan reserves `0.3.0` for closeout, restore package, CLI, LSP, JSON reference, README, and matching tests to `0.2.0`; the standalone performance plan reapplies the coordinated `0.3.0` cut only after its final gates pass. Preserve the unrelated README performance link and untracked performance snapshot exactly.

At the end of this milestone, focused architecture, internal LSP, process LSP, parity, CLI, typecheck, build, and Node 22 full checks are green. A single Node 24 full check may be run only to refresh handoff evidence; it is not made green by increasing parser deadlines, retries, skipped process cases, or test-concurrency changes here. Record its result and stop. The next authorized work item is a standalone performance ExecPlan, not an inline optimization in this file.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix for shell commands. Use pnpm for Node package work, patch-based edits for repository files, unique temporary directories in tests, and no commit unless the user separately asks.

Establish the actual implementation-time baseline rather than assuming the planning snapshot is current:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch --untracked-files=all
    rtk git log -1 --oneline
    rtk node --version
    rtk pnpm --version
    rtk pnpm install --frozen-lockfile
    rtk proxy pnpm check
    rtk proxy pnpm compatibility

The planning snapshot is `a751bb9`, `main...origin/main [ahead 3]`, unrelated modified `README.md`, unrelated untracked `docs/performance/2026-07-23-modern-agent-scan.md`, Node 22.20.0, pnpm 10.30.1, 23 files/190 tests, and 27 fixtures/108 Compatibility Evidence observations. Update this paragraph and the living sections if the checkout moves. Never clean, reset, stage, or overwrite unrelated paths.

Add only the two Stage 4 runtime dependencies:

    rtk pnpm add --save-exact vscode-languageserver@10.1.0 vscode-languageserver-textdocument@1.0.12
    rtk pnpm install --frozen-lockfile
    rtk pnpm list --depth 1

The list must show direct versions `10.1.0` and `1.0.12`, with `vscode-languageserver-protocol 3.18.2` owned transitively by the server. Do not add `vscode-languageclient`, direct protocol/JSON-RPC dependencies, Commander to LSP, a config/glob package, an alternate parser, an editor extension, or a visual dependency.

Run only the suites that exist at each milestone, then broaden them as the surface grows:

    # Milestone 1
    rtk pnpm typecheck
    rtk pnpm exec vitest run tests/architecture

    # Milestone 2
    rtk pnpm typecheck
    rtk pnpm exec vitest run tests/internal/lsp
    rtk pnpm exec vitest run tests/contract/validation

    # Milestones 3 and 4
    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/lsp
    rtk pnpm exec vitest run tests/integration/lsp
    rtk pnpm exec vitest run tests/integration/cli/cli.test.ts

    # Milestone 5
    rtk pnpm exec vitest run tests/integration/lsp
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/internal/canonical-syntax/worker-host.test.ts

    # Milestone 6
    rtk pnpm check
    rtk pnpm compatibility

The Milestone 3 process test should observe an initialize response equivalent to the following while the package remains at `0.2.0`; rerun the same assertion for `0.3.0` after the Milestone 6 closeout bump:

    {
      "capabilities": {
        "positionEncoding": "utf-16",
        "textDocumentSync": { "openClose": true, "change": 2 },
        "codeActionProvider": { "codeActionKinds": ["quickfix"] }
      },
      "serverInfo": {
        "name": "mermaid-diagram-validator",
        "version": "0.2.0"
      }
    }

No extra capability fields are accepted merely because the official library can represent them. The initialize response must remain exactly the Stage 4 surface above unless a deliberate plan revision first adds behavior and acceptance evidence. A client without literal/versioned edit capabilities must not receive `codeActionProvider`, but its diagnostic behavior is unchanged.

Use this source in protocol fixtures:

    flowchart LR
    A["`# Build`"]

For version 1 and default rules, the server publishes one warning Diagnostic with code `flowchart/no-markdown-heading-in-label`, source `mermaid-validator`, and UTF-16 range line 1 character 4 through line 1 character 6. A capable client's Code Action request returns one version-1 TextDocumentEdit replacing that range with an empty string. Applying the edit in the test client yields:

    flowchart LR
    A["`Build`"]

To prove buffer ownership, create any temporary file with valid Mermaid, open its file URI with different invalid in-memory text, and assert the diagnostic follows the open notification rather than the disk. Remove only the unique test temporary directory in `finally`; the server itself must never modify it.

Run the opt-in performance characterization only after behavior is green:

    rtk env MERMAID_VALIDATOR_LSP_PROFILE=1 pnpm exec vitest run tests/integration/lsp/performance.test.ts

Record three first-diagnostic samples and at least five subsequent-version samples. Use debounce `0` only for measuring runtime behavior after scheduling; also retain scheduler tests for the production default `150`. Do not compare a single result with a hard target.

For Milestone 7, begin from the current dirty worktree and inspect every listed path before editing. Do not reset or reconstruct the existing Stage 4 implementation. Run the correctness suites in focused invocations so their result is not confused with the known full-suite contention blocker:

    rtk git status --short --branch --untracked-files=all
    rtk proxy pnpm typecheck
    rtk pnpm build
    rtk pnpm exec vitest run tests/architecture/module-import-boundaries.test.ts
    rtk pnpm exec vitest run tests/internal/lsp
    rtk pnpm exec vitest run tests/integration/lsp/lsp.test.ts
    rtk pnpm exec vitest run tests/integration/lsp/parity.test.ts
    rtk pnpm exec vitest run tests/integration/cli/cli.test.ts

After focused correctness is green, run the ordinary Node 22 gate once. Run Node 24 compatibility once because it is independent evidence. A Node 24 full run is a diagnostic handoff to the standalone performance plan and may still fail with parser timeouts; do not adjust timeouts, Vitest workers, retries, or skips in this milestone.

    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm check
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility

Finish Milestone 7 by inspecting only its intended correctness and status surfaces. The worktree remains uncommitted unless the user separately requests a commit.

    rtk git diff --check
    rtk git diff -- docs/plans/stage-4-lsp-adapter.md DRAFT-PLAN.md ARCHITECTURE.md README.md docs/reference/json-output-v2.md docs/reference/language-server.md package.json src/cli/main.ts src/lsp/server.ts tests/architecture/module-import-boundaries.test.ts tests/helpers/lsp tests/internal/lsp tests/integration/lsp tests/integration/cli tests/unit/cli
    rtk git status --short --branch --untracked-files=all

Run the final explicit runtime matrix. The personal pnpm shim directory is required because the NVM version directories do not contain pnpm shims:

    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" node --version
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm install --frozen-lockfile
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm check
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility

    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" node --version
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm install --frozen-lockfile
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm check
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility

Finish with evidence and worktree inspection:

    rtk pnpm list --depth 1
    rtk git diff --check
    rtk git status --short --branch --untracked-files=all
    rtk git diff -- package.json pnpm-lock.yaml ARCHITECTURE.md DRAFT-PLAN.md docs/reference/language-server.md docs/plans/stage-4-lsp-adapter.md src/lsp tests/architecture tests/internal/lsp tests/integration/lsp tests/helpers/lsp

Inspect `README.md` separately because it was modified before planning. Do not include its unrelated edits or the existing untracked performance document in any future stage, staging operation, or commit.

## Validation and Acceptance

Stage 4 is accepted only when unsaved-buffer ownership, canonical/rule parity, UTF-16 projection, scheduling races, safe Code Actions, process lifecycle, architecture, and regression gates all pass.

For initialization and transport, the built entry accepts `--stdio`, writes no unframed stdout, and answers `initialize` with exactly server name/version `mermaid-diagram-validator` and the current private package version, UTF-16, open/close incremental sync, and capability-gated Quick Fix. During reopened closeout the version is `0.2.0`; the standalone performance plan restores `0.3.0` only at final closeout. It advertises no unrelated providers. Missing/unknown transport arguments fail before protocol output with exit `2`. Invalid private options return an official `ResponseError` with JSON-RPC invalid params code `-32602` and a message no longer than 256 characters. Omitted and whole-value-null initialization options each produce defaults in built-process tests. The package remains private and process tests invoke the built path directly.

For source ownership, `didOpen` and `didChange` text is the only document content used while a URI is open. A file URI whose disk bytes differ proves that no file read occurs. Exact `mermaid` and `markdown` language ids validate; an unsupported id publishes empty diagnostics. Supported buffers accept any URI scheme as an opaque identity, including virtual custom schemes, without path conversion. Markdown extraction and host offsets remain owned by Diagram Validation. For identical snapshot text and the same resolved base rules, standalone and embedded process fixtures preserve CLI finding code, severity, message, and host offsets after LSP ranges are converted back to UTF-16 offsets; LSP Diagnostic source is independently fixed to `mermaid-validator`. CLI path overrides and ambient config discovery are not part of this Stage 4 parity claim.

For positions, every Diagnostic range is zero-based UTF-16. LF, CRLF, BMP Unicode, surrogate pairs, combining marks, Markdown list/blockquote prefixes, multiple blocks, and end-of-file ranges are covered in pure projection tests, and at least one surrogate-pair-plus-combining-mark case crosses the real stdio process. A locationless Finding anchors at `(0,0)` without claiming exact precision. Diagnostic code/message remain the Finding values; severity mapping and source are deterministic.

For scheduling, repeated notifications inside 150 ms coalesce per URI. A newer version immediately invalidates accepted cache, clears pending work, and aborts active work. Each notification is copied before the mutable TextDocument can change. Even if an injected validator ignores abort or a change arrives while diagnostic publication is awaiting, only the current URI/version/generation can publish and enter cache after the post-publication recheck. Separate documents do not cancel each other. Close and shutdown cancel work and clear state. AbortError is silent; an unexpected rejection produces no raw stack, clears current diagnostics, and does not crash the process.

For diagnostics, each accepted publication includes the exact current document version. A syntax error, unsupported diagram type, parser/system failure, warning rule, and error-configured rule preserve core code/severity/validity meaning. Built-process tests observe a real syntax error and a fixture-injected project-shaped system Finding through the same server factory and framing path. Late version 1 work can never overwrite version 2 diagnostics. The process helper retains bounded notification history; after version 2 and the shutdown/exit barrier, that history contains no nonempty version-1 publication. Closing a document publishes an empty list and no later nonempty list. Graceful shutdown exits zero; exit without shutdown exits one.

For Quick Fix, only a client with literal support, `quickfix` in `codeActionKind.valueSet`, and versioned `documentChanges` sees the provider; the always-registered handler returns an empty array when any condition is absent. The handler matches code, message, severity, source, and range against current cached diagnostics, requires at least one current fixable request-context match, replans the entire current buffer with the same resolved rules, and returns exactly one versioned document-wide Quick Fix only for `DocumentFixStatus: "changed"`. The returned action lists every current cached fixable Diagnostic in the document, including those outside the triggering context, so its diagnostic metadata matches the full planner edit scope. The edit list and in-memory applied output equal the planner. A changed or closed buffer during planning, AbortError or ignored cancellation, unexpected planner rejection, every non-changed status, malformed defensive range, absent/current-cache mismatch, unknown context diagnostic, or client supporting only another action kind returns no action. The action omits `isPreferred`. The server neither writes the file nor calls `workspace/applyEdit`.

For performance, the historical implementation record contains three fresh-process didOpen-to-matching-diagnostic samples and five serialized, equivalent-work, warm same-process change samples with median/range and environment. Spawn-to-initialize, if reported, is separate. No timing number is an SLA. Correctness hardening retains one server process, scheduler debounce/cancellation, a deterministic worker-host test proving canonical worker reuse after successful requests, and no new worker pool/cache/daemon. It does not change the 10-second parser deadline or Vitest concurrency. The standalone performance ExecPlan owns resource-contention measurements and the final repeated runtime gates.

For architecture, LSP imports only its subtree and `src/validation/index.ts`; validation never imports LSP; adapters never import each other; LSP packages appear only under `src/lsp/**`; no LSP file imports Mermaid, JSDOM, mdast, Globby, Commander, Zod, compatibility engines, filesystem/path discovery, or child-process APIs. The checker rejects both `node:`-prefixed and unprefixed forms of `fs`, `fs/promises`, `path`, and `child_process`. The project graph remains acyclic. MCP, Semantic Facts, rendering, geometry, image, layout, vision, editor extension, and future output modules remain absent.

For Milestone 7 regression safety, all focused correctness suites, Node 22.20.0 `pnpm check`, and both runtime compatibility gates pass; Compatibility Evidence remains 27 fixtures/108 observations. Existing CLI terminal/JSON/config/discovery/fix behavior and exit precedence remain unchanged. Stage 4 final acceptance additionally requires the standalone performance plan to demonstrate three consecutive default `pnpm check` successes under Node 24.18.0 and one under Node 22.20.0, with no parser timeout, product-timeout increase, retry, skip, or removal of real process coverage. Until that evidence exists, Stage 4 remains closeout-blocked regardless of focused correctness success.

## Idempotence and Recovery

Dependency installation is repeatable: add the two exact packages once, then use frozen installs. Generated `dist/` output may be rebuilt and must never be edited manually or emitted beside TypeScript sources. Process tests create unique child processes and temporary files, close them through the LSP shutdown/exit sequence when possible, and force-kill only their own child during `finally` cleanup.

Opening or changing a document mutates only in-memory server state. Repeating a notification with a newer version schedules a new immutable snapshot. Closing and reopening a URI starts fresh state. Restarting the server is the recovery path for initialization-option changes or unexpected transport failure. The server does not create backups, write open documents, or retain state across processes.

Quick Fix computation is side-effect free. `planDocumentFixes()` returns proposed edits but the server never applies them. A client may reject an edit if the version no longer matches; requesting Code Actions again replans from the current buffer. Because the planner already proves idempotence, a successfully client-applied full action produces no further safe edit under the same rules.

If an LSP library API or conditional export differs from the researched metadata, first isolate the smallest compile/process example using the exact pins. Prefer updating imports inside `src/lsp/` over changing TypeScript module resolution or adding direct transitive dependencies. Record the discovery and decision here. Change a pin or load-bearing dependency direction only with refreshed evidence and an ADR when `ARCHITECTURE.md` requires one.

If cancellation causes repeated worker cold starts during real typing, retain correctness and record the measurements. Do not silently stop rejecting stale work or add multiple workers. A follow-up performance plan may evaluate logical cancellation, prewarming, or isolation only after Stage 4 exposes reproducible warm/cold evidence.

Preserve all unrelated worktree changes. Never reset, delete, stage, or commit `README.md`, `docs/performance/2026-07-23-modern-agent-scan.md`, or another user's changes as cleanup. Do not commit unless explicitly requested.

## Artifacts and Notes

Planning-time repository evidence:

    $ rtk git rev-parse --short HEAD
    a751bb9

    $ rtk git status --short --branch --untracked-files=all
    ## main...origin/main [ahead 3]
     M README.md
    ?? docs/performance/2026-07-23-modern-agent-scan.md

    $ rtk node --version
    v22.20.0

    $ rtk pnpm --version
    10.30.1

Planning-time full gate:

    Repository hygiene: clean across tracked and untracked files
    Compatibility summary: 27 fixtures, 108 observations
    Verdict mismatches: mermaid-lint-official 0; mermaid-lint-aggregate 1 [pie-invalid-header]; merman 1 [pie-invalid-header]
    Official diagnostics: approximate locations 9/15; document-only 6/15; coordinate expectations 5/5
    Merman facts: complete 12/12; partial 0; unavailable 0
    Test Files  23 passed (23)
    Tests       190 passed (190)

Planning-time focused compatibility gate:

    Test Files  4 passed (4)
    Tests       16 passed (16)

Planning-time registry metadata:

    $ rtk proxy pnpm view vscode-languageserver version
    10.1.0

    $ rtk proxy pnpm view vscode-languageserver-textdocument version
    1.0.12

    vscode-languageserver@10.1.0
      -> vscode-languageserver-protocol@3.18.2
      -> Node export: vscode-languageserver/node

Current Stage 3 external scan characterization, recorded before planning and not treated as an SLA:

    Target: /Users/wangzhihao/Documents/playground/modern-agent
    Documents: 238
    Diagrams: 22
    Findings/input errors: 0/0
    Fresh JSON process seconds: 6.614, 4.514, 4.278
    Median/range: 4.514 / 4.278–6.614

Historical implementation-time Stage 4 protocol and performance evidence from the uncommitted worktree based on `f1a9e30`:

    Initialize (capable client): UTF-16; open/close incremental sync; quickfix only; server 0.3.0
    Unsaved diagnostic: version 1; flowchart/no-markdown-heading-in-label; line 1 characters 4–6
    Quick Fix: one version-1 TextDocumentEdit deleting the planner-approved marker span
    Lifecycle: shutdown response then exit 0; exit without shutdown 1; invalid transport 2

    Node 22.20.0, pnpm 10.30.1, base commit f1a9e30 plus uncommitted Stage 4 changes, debounce 0, 28 UTF-16 units, 1 diagram
    First diagnostic ms: 3330.7, 3322.2, 3430.5
    First median/range ms: 3330.7 / 3322.2–3430.5
    Warm change ms: 6.0, 5.8, 5.7, 5.4, 5.1
    Warm median/range ms: 5.7 / 5.1–6.0
    Cache note: mixed filesystem and operating-system caches; descriptive only, no SLA

    Implementation-time full gate on Node 22.20.0 and Node 24.18.0: 29 files, 242 passed, 1 opt-in skipped
    Implementation-time compatibility on both runtimes: 4 files, 16 tests, 27 fixtures, 108 observations

Post-implementation review evidence that reopened closeout:

    Node 22.20.0 pnpm check: 29 files passed, 242 tests passed, 1 opt-in skipped
    Node 22.20.0 compatibility: 4 files passed, 16 tests passed, 27 fixtures, 108 observations
    Node 24.18.0 pnpm check: 3 files failed, 26 passed, 1 skipped; 3 tests failed, 239 passed, 1 skipped
    Node 24 failures: valid inputs reported system/parser-timeout after the unchanged 10000 ms product deadline
    Node 24 isolated affected files: 3 files passed, 51 tests passed, 96.82 seconds
    Node 24.18.0 compatibility: 4 files passed, 16 tests passed, 27 fixtures, 108 observations
    Current status: implementation complete; correctness hardening pending; closeout blocked on standalone performance work

## Interfaces and Dependencies

At the end of Stage 4, the existing Diagram Validation interface remains semantically unchanged:

    export interface DocumentSnapshot {
      readonly uri: string;
      readonly languageId: "mermaid" | "markdown";
      readonly text: string;
      readonly version?: number;
    }

    export interface ValidateOptions {
      readonly mode?: "canonical";
      readonly rules?: ResolvedRuleConfiguration;
      readonly signal?: AbortSignal;
    }

    export async function validateDocument(
      document: DocumentSnapshot,
      options?: ValidateOptions,
    ): Promise<ValidationResult>;

    export async function planDocumentFixes(
      document: DocumentSnapshot,
      options?: ValidateOptions,
    ): Promise<DocumentFixPlan>;

Do not widen `mode`, add LSP protocol types, or expose worker lifecycle through `src/validation/index.ts` in this stage.

`src/lsp/contracts.ts` defines private project-owned resolved initialization data equivalent to:

    interface ResolvedLspInitialization {
      readonly debounceMs: number;
      readonly rules: ResolvedRuleConfiguration;
    }

    type LspInitializationResolution =
      | { readonly ok: true; readonly value: ResolvedLspInitialization }
      | { readonly ok: false; readonly message: string };

    function resolveLspInitializationOptions(
      input: unknown,
    ): LspInitializationResolution;

The raw protocol value accepts null/absence for defaults or the strict object `{ debounceMs?: number, rules?: unknown }`. These are private process options, not a package export or stabilized public schema.

`src/lsp/diagnostics.ts` provides pure internal operations equivalent to:

    interface ProjectedFinding {
      readonly finding: Finding;
      readonly diagnostic: Diagnostic;
    }

    function projectValidationResult(
      document: TextDocument,
      result: ValidationResult,
    ): readonly ProjectedFinding[];

    function projectPlanEdits(
      document: TextDocument,
      edits: readonly TextEdit[],
    ): readonly ProtocolTextEdit[] | undefined;

The exact upstream aliases may differ, but no upstream Diagnostic, Range, CodeAction, or TextDocument type crosses outside `src/lsp/`.

`src/lsp/validation-scheduler.ts` owns state equivalent to:

    interface AcceptedDocumentState {
      readonly snapshot: DocumentSnapshot;
      readonly result: ValidationResult;
      readonly projected: readonly ProjectedFinding[];
      readonly rules: ResolvedRuleConfiguration;
      readonly generation: number;
    }

    interface ValidationScheduler {
      schedule(document: TextDocument, rules: ResolvedRuleConfiguration): void;
      close(uri: string, version?: number): void;
      current(uri: string): AcceptedDocumentState | undefined;
      dispose(): void;
    }

`AcceptedDocumentState` contains only immutable copied primitives and project-owned result values; it never retains the mutable `TextDocument` from the live store. Projection and fix-edit conversion recreate a snapshot-specific official TextDocument from `snapshot`. Production dependencies call Diagram Validation and await `connection.sendDiagnostics`. Tests inject validation, publication, timers, and logger. Timers and controllers are never global maps outside the scheduler.

`src/lsp/server.ts` exposes an import-safe internal factory equivalent to:

    interface LanguageServerDependencies {
      readonly validate: typeof validateDocument;
      readonly planFixes: typeof planDocumentFixes;
      readonly stderr: Pick<NodeJS.WriteStream, "write">;
    }

    function createLanguageServer(
      connection: Connection,
      documents: TextDocuments<TextDocument>,
      dependencies?: Partial<LanguageServerDependencies>,
    ): { listen(): void; dispose(): void };

The final shape may hide more upstream types by accepting a smaller local connection port. Preserve testability, handler ownership, and the rule that only `src/lsp/**` sees LSP package values.

The final direct product dependency additions are exactly:

- `vscode-languageserver@10.1.0`, imported only from `src/lsp/**` through its Node export;
- `vscode-languageserver-textdocument@1.0.12`, imported only from `src/lsp/**`.

The server's exact transitive `vscode-languageserver-protocol@3.18.2` remains lockfile-owned rather than a direct import. Existing exact pins and owners remain unchanged: Mermaid/JSDOM inside Canonical Syntax and compatibility observers, mdast inside Markdown extraction, Globby inside CLI discovery, Commander inside CLI, Zod inside the rule option adapter, and mermaid-lint/Merman inside Compatibility Evidence.

No public package interface is created. Keep `private: true`; do not add declarations, `exports`, `types`, a programmatic LSP factory export, installed-consumer tests, publication metadata, editor-extension packaging, a monorepo, or later-stage dependencies.

## Revision Note

2026-07-27: Created the Stage 4 LSP ExecPlan from the completed and review-hardened Stage 3 tree. The plan exact-pins the official Node LSP server and text-document helper, keeps `src/lsp/` inward-facing through `src/validation/index.ts`, defines stdio lifecycle, unsaved incremental buffers, canonical UTF-16 push diagnostics, strict private initialization options, debounce/cancellation/version rejection, planner-backed versioned Quick Fixes, and cold-versus-warm characterization. It leaves config-file discovery/watching, noncanonical fast mode, Semantic Facts, public APIs/plugins, MCP/CI outputs, and every visual capability deferred.

2026-07-27: Incorporated an independent design-intent and contract review before implementation. The revision copies live documents at notification time, invalidates cache on every change, rechecks after awaited diagnostic publication, constructs official invalid-params responses, registers Code Action handling before listen while capability-gating advertisement/results, removes `isPreferred`, defines base-rule CLI/LSP equivalence, separates deterministic cancellation/reuse proofs from process timing, fixes cold/warm clock semantics, and makes shutdown respond before the later exit notification.

2026-07-27: Began the user design-grilling pass. Confirmed that Stage 4 rule configuration is supplied only through strict private `initializationOptions`; the LSP does not discover or watch the CLI-owned config file, and Stage 6 retains configuration hardening.

2026-07-27: Confirmed atomic initialization-option validation. Omitted or null options use defaults, while unknown fields or invalid supplied values fail `initialize` with bounded JSON-RPC `-32602 InvalidParams` instead of being ignored or partially applied.

2026-07-27: Confirmed one server-global debounce setting with a 150 ms default and a strict safe-integer range of 0 through 2,000 ms. Zero remains available for deterministic tests and already-debounced clients; per-document debounce policy remains out of scope.

2026-07-27: Confirmed a stdio-only Stage 4 transport contract. The built entry accepts exactly one `--stdio` flag; missing, duplicate, unknown, socket, pipe, and Node IPC arguments fail with exit 2 and bounded stderr before any protocol bytes reach stdout.

2026-07-27: Confirmed exact LSP language identifiers `mermaid` and `markdown`. Unsupported identifiers clear scheduler state and diagnostics without validation, Code Actions, URI-extension inference, or disk reads; aliases and MDX require later real-client fixtures.

2026-07-27: Confirmed that a locationless document-level Finding projects to the zero-width LSP range `(0,0)-(0,0)`. The adapter does not highlight the first line or whole document and therefore does not invent token precision that Diagram Validation did not provide.

2026-07-27: Confirmed active cancellation on every newer document version. The scheduler aborts stale validation even though an in-flight canonical request kills its worker; current-editor responsiveness and stale-work rejection take priority, while the performance characterization records restart cost without turning it into an SLA.

2026-07-27: Confirmed that an unexpected non-abort adapter rejection is not projected as a document problem. For a still-current version, the server clears stale diagnostics, writes one fixed bounded stderr message without raw error values, and remains alive; expected parser failures continue through stable `system/*` Findings.

2026-07-27: Confirmed that the Stage 4 Code Action uses the complete document as its safety and edit unit. Invoking it for one matching diagnostic may apply every planner-approved safe edit in that document; the explicit title communicates this scope, and per-Finding splitting remains deferred until Diagram Validation exposes a separately proven subset planner.

2026-07-27: Confirmed LSP Code Action kind `quickfix` rather than `source.fixAll`. The provider is diagnostic-contextual and Stage 4 does not promise automatic save-time source actions; the title remains responsible for communicating the document-wide edit scope.

2026-07-27: Confirmed that every eligible Code Action request reruns `planDocumentFixes()` against a fresh current-buffer snapshot with the cached resolved rule selection. Cached Finding edits only establish relevance; the planner remains the edit authority, and a post-plan open-version check plus versioned `TextDocumentEdit` rejects stale output.

2026-07-27: Confirmed that the document-wide Quick Fix omits `isPreferred`. Stage 4 does not ask clients to favor or preselect a multi-location action; users choose it explicitly, leaving room for future narrower actions with separately proven safety semantics.

2026-07-27: Confirmed that Stage 4 Diagnostics carry no private correlation payload in `Diagnostic.data`. Code Action context is matched against the current accepted cache by exact visible diagnostic fields, while current-version checks, fresh replanning, and the versioned edit remain the stale-safety authorities.

2026-07-27: Confirmed canonical-only LSP validation for Stage 4. The optional noncanonical fast mode remains deferred until Diagram Validation has an accepted provenance and UI-labeling contract with fixtures; the current `ValidateOptions` interface is not widened.

2026-07-27: Confirmed opt-in performance characterization without a wall-clock gate or SLA. Stage 4 records at least three fresh-process first-diagnostic samples and five equivalent-work warm same-process samples with raw values, median, range, and environment, while correctness and lifecycle shape remain the enforced requirements.

2026-07-27: Confirmed that CLI/LSP parity compares ordered finding code, severity, message, and equivalent host UTF-16 offsets for identical text and the same resolved base rules. LSP adapter source is asserted separately; CLI path overrides and ambient config discovery are outside the Stage 4 equivalence claim.

2026-07-27: Confirmed that the document-wide `quickfix` is diagnostic-contextual. The handler offers it only when request `context.diagnostics` contains an exact visible-field match for a current cached fixable Diagnostic; unrelated cursor ranges or diagnostics do not surface a document-wide action merely because another fix exists elsewhere.

2026-07-27: Confirmed a small repository-owned framed stdio client for Stage 4 process tests. The harness exercises the built server and raw LSP framing/lifecycle directly without adding `vscode-languageclient`, a VS Code extension runtime, or another product/client surface.

2026-07-27: Confirmed that deterministic internal scheduler tests are authoritative for active-cancellation and stale-publication races. Real stdio tests still prove newest-version behavior, but acceptance does not depend on forcing a machine-timing-sensitive mid-parse race.

2026-07-27: Closed an unstated URI-scheme branch. Supported `mermaid` and `markdown` buffers accept any URI scheme as an opaque identifier; `file:`, `untitled:`, and a custom virtual scheme receive process coverage, while the server never parses or allowlists URI schemes or converts them into paths.

2026-07-27: Confirmed that Stage 4 assumes monotonically increasing versions from protocol-conforming clients. Scheduler generation/version checks reject asynchronous stale work, but the server does not add a second document model or recovery semantics for duplicate or decreasing `didChange` versions.

2026-07-27: Confirmed uniform LSP Diagnostic source `mermaid-validator`. Core origin remains observable through stable namespaced codes such as `mermaid/*`, `system/*`, and rule ids; the adapter does not alternate source labels between parser, system, and rule Findings.

2026-07-27: Confirmed a minimal Stage 4 Diagnostic projection. Core `help`, `diagramType`, `engine`, `locationPrecision`, and candidate fixes are not copied into messages or protocol metadata; Code Actions carry planner-approved fixes, while richer metadata awaits a separately stabilized mapping.

2026-07-27: Aligned Code Action diagnostic metadata with its document-wide edit scope. At least one exact request-context match is still required to offer the action, but a successful returned action lists every current cached fixable Diagnostic in the document rather than only the triggering subset.

2026-07-27: Confirmed that every refused, cancelled, stale, closed, or unchanged fix plan returns no Code Action. Stage 4 does not negotiate or expose disabled actions and does not stabilize planner refusal statuses as user-facing LSP vocabulary.

2026-07-27: Confirmed that Stage 4 adds no speculative Markdown prefilter, parser prewarming, worker pool, persistent daemon/cache, bounded parallel extraction, or logical-cancellation mode. The stage first establishes and measures the long-lived interactive workload without mixing core or CLI optimization work into the LSP adapter.

2026-07-27: Confirmed that Stage 4 cold/warm samples and environment metadata remain in this living ExecPlan. No new `docs/performance/` artifact is created unless later optimization work establishes a maintained benchmark or retest contract.

2026-07-27: Closed the unrelated-provider initialize-capability loophole. Stage 4 advertises exactly server identity, UTF-16, open/close incremental synchronization, and a `quickfix` provider; unrelated extra providers are test failures unless a deliberate plan revision first adds their behavior and acceptance evidence. A later review separately found that the Quick Fix gate must inspect the client's declared Code Action kind value set.

2026-07-27: Completed the 29-branch user design-grilling pass and locked Stage 4 scope. At that review point implementation had not started. The plan records every confirmed decision inline, including strict initialization-only configuration, canonical validation, active cancellation, opaque URI schemes, minimal Diagnostics, current-context-triggered document-wide Quick Fixes that list all current fixable Diagnostics, deterministic race tests, raw stdio process coverage, descriptive performance evidence, and an exact initialize capability surface. All Stage 5/6, public-package, editor-extension, CI-output, MCP, and visual work remained outside the planned implementation.

2026-07-27: Implemented and closed Stage 4. The private `v0.3.0` tree adds only the exact-pinned LSP server and text-document helper behind `src/lsp/`, preserves the Diagram Validation seam and official Mermaid verdict, delivers versioned unsaved-buffer diagnostics and planner-approved current-version Quick Fixes, records built-process parity/lifecycle and cold/warm evidence, and passes the complete and compatibility gates on both supported Node runtimes. No Stage 5/6 or visual scope was added, and no commit was created.

2026-07-27: Independently reviewed and hardened the integrated implementation. The follow-up bounds every invalid-params message, rejects present null option fields, rechecks request cancellation after an uncooperative fix planner, and contains rejected diagnostic publications including close cleanup. Six focused regression cases raise the final full gate from 236 to 242 passing tests on both supported Node runtimes.

2026-07-28: Reopened Stage 4 closeout after a fresh plan-against-implementation review and a one-question-at-a-time user interview. The review found that the Quick Fix gate ignores the client's supported kind value set, the Milestone 4 planner matrix and Milestone 5 process evidence are incomplete, bare Node builtin imports can bypass the LSP architecture check, and a fresh default Node 24 full gate produced three 10-second canonical parser timeouts although the affected files passed in isolation. Added Milestone 7 for correctness only, changed the current state to “implementation complete; closeout blocked,” retained the 10-second product deadline, reserved test-process contention for a standalone performance ExecPlan, and set final performance acceptance to three consecutive Node 24 full gates plus one Node 22 full gate without retries, skips, removed process tests, or timeout increases.
