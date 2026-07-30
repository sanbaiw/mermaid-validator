# Deliver Stage 5 Semantic Facts and rules

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` controls Stage 5 scope and exit criteria, `ARCHITECTURE.md` controls module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes exact-pinned official Mermaid as the sole canonical syntax authority while accepting exact-pinned Merman only as an optional, replaceable Semantic Facts accelerator. The completed predecessor is `docs/plans/stage-4-lsp-adapter.md`; `docs/plans/stage-4-diagnostic-usability-hardening.md` records the post-Stage-4 diagnostic surface at the planning baseline. This plan repeats every contract needed to implement Stage 5 without relying on prior conversation or agent memory.

## Purpose / Big Picture

After Stage 5, the validator can report structural problems that are invisible to syntax validation. A Flowchart such as `flowchart LR` followed by an unconnected `A` and an edge `B --> C` is valid Mermaid, but the new default-warning rule `flowchart/no-isolated-nodes` reports that `A` has no incident edge. The same in-memory validation operation also gains configurable rules for excessive Sequence participants, excessive Pie slices, excessive Class members, and unreachable flat State nodes. These Findings appear through the existing CLI, JSON-v2, and LSP projections without changing which source official Mermaid accepts or rejects.

The new behavior is safe when the independent facts provider knows less than official Mermaid. Stage 5 introduces a small, versioned, project-owned Semantic Facts contract. Every fact capability, such as `flowchart.nodes` or `state.reachability`, carries `complete`, `partial`, or `unavailable` coverage. A facts-dependent rule runs only when every capability it declares is complete. Otherwise Diagram Validation records a user-visible `ruleSkips` entry instead of guessing. A provider rejection or an evidence-bounded unsupported profile produces skips but never changes the canonical Mermaid verdict. An actual provider initialization, runtime, or protocol failure produces one bounded system Finding for the diagram as well as the affected skips, so a broken validator dependency cannot silently look like complete validation.

Stage 5 delivers all five rule/family pairs required by `DRAFT-PLAN.md`, but it does so incrementally. The first complete vertical slice is Flowchart facts plus `flowchart/no-isolated-nodes`; only after that slice proves lazy loading, coverage gating, Markdown mapping, JSON, LSP parity, and failure isolation do Sequence, Pie, Class, and State join the built-in registry. No rule in this stage offers a fix because Merman does not provide source ranges proven exact enough for safe edits. Locationless semantic Findings remain document-level for standalone Mermaid and map to the responsible Mermaid block with approximate precision in Markdown.

This stage does not add rendering, SVG or PNG generation, browser automation, geometry, layout comparison, visual review, MDX, a noncanonical fast mode, dynamic plugin loading, package-level exports, SARIF, JUnit, GitHub Actions, MCP, or Stage 6 production hardening.

## Progress

- [x] (2026-07-30 13:44Z) Read all of `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 3 and Stage 4 plans, the diagnostic-hardening plan, current validation/rule/fix/CLI/LSP contracts, Merman Compatibility Evidence, architecture checks, package metadata, and reference documentation.
- [x] (2026-07-30 13:44Z) Established the planning baseline at detached commit `1c199d0c9785aec399b6aaf0d8b1124366f5137d`, which includes completed Stage 4 diagnostic usability hardening. The recorded implementation evidence is 31 test files / 281 passed tests with one opt-in performance test skipped, plus 4 compatibility files / 16 tests over 27 fixtures / 108 observations on Node 24.18.0 and Node 22.22.2.
- [x] (2026-07-30 13:44Z) Inspected the exact-pinned `@mermanjs/web@0.7.0` observer. It initializes one WASM module, calls `validate()` and `parseObject()`, and already selects nodes/edges, participants/messages, Pie sections, Class member counts/relations, and recursively nested State transitions without leaking raw parse objects.
- [x] (2026-07-30 13:44Z) Resolved the Stage 5 contracts in this plan: capability-level coverage, lazy one-per-diagram facts loading, bounded provider outcomes, facts-aware prerequisites, public skip metadata, default rule severities/options, location policy, State reachability boundary, dependency ownership, adapter failure behavior, and the nonvisual Stage 5 ceiling.
- [ ] Re-establish a runnable frozen-install baseline on supported Node 24.18.0 and Node 22.x, record the actual pre-change test counts, and preserve any unrelated user changes. Plan-authoring did not rerun the suite because this worktree has no `node_modules` and its Corepack shim attempted a blocked registry lookup.
- [ ] Implement Milestone 1: create the repository-local Stage 5 facts/rule corpus and prove the supported Merman fact profile without changing the Stage 0 compatibility corpus.
- [ ] Implement Milestone 2: add the project-owned Semantic Facts capability, exact runtime dependency ownership, local Merman adapter, coverage validation, and derived Flowchart graph facts.
- [ ] Implement Milestone 3: extend the private Rule Engine with facts prerequisites, lazy provider execution, coverage-aware skips, and bounded fact-provider system failures.
- [ ] Implement Milestone 4: deliver the Flowchart vertical slice through core, CLI/JSON, Markdown, LSP parity, and fix-planner regression coverage.
- [ ] Implement Milestone 5: add the Sequence, Pie, Class, and State fact shapes and initial semantic rules with strict options and deterministic output.
- [ ] Implement Milestone 6: complete delivery-adapter, failure, cancellation, performance-characterization, and dual-runtime acceptance evidence.
- [ ] Implement Milestone 7: update reference documentation, architecture/roadmap status, package version `0.4.0`, living-plan evidence, and stop before Stage 6.

## Surprises & Discoveries

- Observation: Stage 0 proves selected Merman facts only by comparing each valid fixture with hand-written expected facts; it does not provide a runtime completeness signal for arbitrary Mermaid syntax.
  Evidence: `src/compatibility/engines/merman.ts` computes `complete-for-fixture` by JSON equality with `fixture.expectedFacts`. Product code therefore cannot copy that label or infer grammar-wide completeness merely because Merman accepted a source.

- Observation: The current State summary is adequate for selected state/transition evidence but insufficient to claim composite-state reachability.
  Evidence: the Compatibility Evidence recursively reads nested `doc` statements, but the selected summary flattens states and transitions and removes composite `_start`/`_end` boundaries. In the valid composite fixture, `Working` and `Waiting` form a nested cycle under `Active` without a flattened transition from root entry to either child. A root-level graph walk would falsely call them unreachable.

- Observation: Merman is currently a development dependency even though Stage 5 makes it product runtime code.
  Evidence: `package.json` lists `@mermanjs/web@0.7.0` in `devDependencies`, and `tests/architecture/engine-versions.test.ts` currently asserts that placement. Stage 5 must move the same exact pin to `dependencies`; it must not add a second semantic parser.

- Observation: The Merman web package requires a package-relative WASM asset read before its API can be used.
  Evidence: the existing observer resolves `@mermanjs/web/pkg/merman_wasm_bg.wasm`, reads it through `node:fs/promises`, and passes the bytes to `initMerman()`. The Stage 5 architecture checker must permit that narrow asset read only in the local product adapter; it must not grant general filesystem ownership to root Diagram Validation or rules.

- Observation: Existing rule prerequisites are closed strings and the rule runner returns only Findings.
  Evidence: `src/validation/rules/contracts.ts` defines `RulePrerequisite = "text" | "syntax-valid"`; `runRules()` skips internally and returns `readonly ExecutedRuleFinding[]`; `ValidationResult` contains no skip metadata. Stage 5 must change these private seams together so incomplete facts become observable without turning a skip into a Finding.

- Observation: The current Markdown mapper already has the right conservative fallback for locationless semantic Findings.
  Evidence: `mapEmbeddedFinding()` maps a Finding without a diagram-relative span to the embedded diagram body and changes its precision to `approximate`. Stage 5 does not need an unproven identifier scanner merely to manufacture exact semantic ranges.

- Observation: JSON-v2 is a private pre-release schema that has already gained additive Stage 3 fields without changing its integer version.
  Evidence: `docs/reference/json-output-v2.md` says there is no backward-compatibility promise, and Stage 3 added optional Finding fixes plus document fix state while retaining `schemaVersion: 2`. Stage 5 can add optional `ruleSkips` and a summary count while keeping version 2, provided existing fields keep their meaning.

- Observation: Merman's `validate()` and `parseObject()` path is synchronous after asynchronous WASM initialization and has no cooperative AbortSignal API.
  Evidence: the current observer calls both methods directly after `initMerman()`. Stage 5 can check cancellation before initialization, after initialization, and after parsing, but cannot preempt one synchronous parse. A killable facts worker and process memory limits remain Stage 6 work unless implementation evidence shows the direct adapter cannot satisfy the Stage 5 LSP characterization.

- Observation: The planning checkout is ahead of `origin/main` and includes post-Stage-4 diagnostic hardening.
  Evidence: HEAD is `1c199d0`; `origin/main` is `754810a`. Stage 5 must preserve `src/validation/syntax-help.ts`, approximate-location presentation, bounded terminal context, and the current 31-file/281-test closeout surface.

## Decision Log

- Decision: Deliver all five DRAFT-PLAN Stage 5 families in one living ExecPlan, but require a complete Flowchart vertical slice before implementing the other four.
  Rationale: Flowchart proves the new architecture end to end with the simplest graph rule. The Stage 5 exit criteria still require every target family to have a tested adapter and at least one rule, so stopping after Flowchart would not complete the active stage.
  Date/Author: 2026-07-30 / Codex.

- Decision: Keep official Mermaid 11.16.0 as the only canonical syntax authority and call the Semantic Facts provider only after an `accepted` canonical outcome for one of the five supported families.
  Rationale: Merman accepted the invalid `pieChart` header in Stage 0. A Merman acceptance, rejection, type disagreement, or missing capability must never accept syntax, remove a Mermaid Finding, or alter the normalized canonical diagram type.
  Date/Author: 2026-07-30 / Codex.

- Decision: Model completeness per named fact capability with `complete`, `partial`, and `unavailable`, not as one diagram-wide boolean.
  Rationale: A provider can know Class members completely while not proving Class relations, or know nested State nodes/transitions while not proving reachability through composite entry semantics. Capability-level coverage lets each rule declare exactly what it needs and prevents both false confidence and unnecessary skips.
  Date/Author: 2026-07-30 / Codex.

- Decision: Use the fixed capability names `flowchart.nodes`, `flowchart.labels`, `flowchart.edges`, `flowchart.connected-components`, `sequence.participants`, `sequence.messages`, `pie.sections`, `class.classes`, `class.members`, `class.relations`, `state.states`, `state.transitions`, and `state.reachability` for facts schema version 1.
  Rationale: These names cover the Stage 5 roadmap, are independent of Merman raw field names, and let rules express narrow prerequisites. New capabilities require an intentional facts-schema revision rather than an arbitrary string emitted by an adapter.
  Date/Author: 2026-07-30 / Codex.

- Decision: Keep Semantic Facts and provider contracts private inside `src/validation/semantic-facts/`; expose only `RuleSkip` as part of `ValidationResult` through `src/validation/index.ts`.
  Rationale: CLI and LSP need Findings and observable skips, not raw graph objects. Keeping fact envelopes internal prevents premature package compatibility promises and lets Stage 6 decide whether any programmatic facts or plugin interface becomes public.
  Date/Author: 2026-07-30 / Codex.

- Decision: Create `src/validation/semantic-facts/` with `index.ts`, `contracts.ts`, `merman-adapter.ts`, `normalize-merman.ts`, and `graph.ts`.
  Rationale: Stage 5 activates one cohesive capability. `contracts.ts` owns project types, `merman-adapter.ts` alone owns dynamic package/WASM initialization, `normalize-merman.ts` alone understands raw Merman shapes, `graph.ts` owns provider-independent derived graph operations, and `index.ts` is the only import seam for root Validation and Rules.
  Date/Author: 2026-07-30 / Codex.

- Decision: Permit `src/validation/rules/**` to type-import only `src/validation/semantic-facts/index.ts`; forbid Rules from importing the Merman adapter, raw normalizer, filesystem APIs, or `@mermanjs/web`.
  Rationale: rules consume project-owned facts, while Diagram Validation owns provider selection and execution. This is the accepted Stage 5 direction described by `ARCHITECTURE.md`; it does not make Rules an upstream adapter or reverse a delivery dependency. Extend the architecture check's edge record with a type-only flag so this is mechanically enforced rather than a prose convention.
  Date/Author: 2026-07-30 / Codex.

- Decision: Move exact-pinned `@mermanjs/web@0.7.0` from `devDependencies` to `dependencies` and add no other dependency.
  Rationale: the built private CLI and LSP need Merman and its WASM asset at runtime. The exact package already passed Stage 0 evidence; a second graph/parser library would enlarge the trust and package surface without serving a Stage 5 requirement.
  Date/Author: 2026-07-30 / Codex.

- Decision: Initialize and call Merman in the main validation process behind the local adapter during Stage 5, reuse one successful initialization, clear a rejected initialization promise so a later request may retry, and characterize cold/warm LSP cost.
  Rationale: the accepted architecture names a local adapter rather than a second worker, and Stage 6 owns process-level time/memory hardening. Lazy one-per-diagram invocation, bounded outcomes, scheduler generation rejection, and before/after cancellation checks are sufficient for the initial semantic MVP unless measured Stage 5 evidence proves otherwise. If a real-process characterization reveals event-loop starvation or process instability, pause implementation, record the evidence here, and update `ARCHITECTURE.md` plus this decision before adding isolation.
  Date/Author: 2026-07-30 / Codex.

- Decision: Extend `RulePrerequisite` with an object `{ kind: "facts", capabilities: readonly SemanticFactCapability[] }`; a facts rule must declare exactly one supported diagram family and only capabilities from that family.
  Rationale: an object keeps the requirement atomic and self-describing. Registry validation can reject empty, duplicate, unknown, or cross-family capability lists before configuration or validation begins.
  Date/Author: 2026-07-30 / Codex.

- Decision: Make `runRules()` return a `RuleExecutionResult` containing ordered Findings and ordered skips, and give it a lazy memoized facts loader rather than preloading facts in root Validation.
  Rationale: the Rule Engine already owns applicability and prerequisite decisions. It is the only layer that knows whether an enabled, type-applicable facts rule exists. A memoized loader ensures zero Merman calls for invalid syntax, unsupported families, all-facts-rules-off selections, or type-mismatched rules and at most one call for a diagram with several semantic rules.
  Date/Author: 2026-07-30 / Codex.

- Decision: Emit `RuleSkip` only for an enabled, diagram-type-applicable facts rule whose canonical syntax is accepted but whose required facts are not complete.
  Rationale: `off`, diagram-family mismatch, and syntax-invalid gating are intentional non-execution and already have configuration or canonical explanations. Recording them would create noisy metadata. Facts incompleteness is independently actionable and is the behavior Stage 5 explicitly requires users to see.
  Date/Author: 2026-07-30 / Codex.

- Decision: Add optional, omitted-when-empty `ruleSkips` to `ValidationResult`. Each skip contains `ruleId`, zero-based `diagramIndex`, normalized `diagramType`, `reason`, sorted `requiredCapabilities`, and sorted `unavailableCapabilities`.
  Rationale: diagram index is stable for standalone and Markdown documents, while a skip has no trustworthy source span. Required and unavailable capability lists explain exactly why a rule did not run without exposing Merman payloads or error strings.
  Date/Author: 2026-07-30 / Codex.

- Decision: Use skip reasons `facts-incomplete`, `facts-unavailable`, and `facts-provider-failed`.
  Rationale: partial coverage differs from total provider disagreement/unavailability, and actual infrastructure failure must be distinguishable from both. If any required non-complete capability is `partial`, use `facts-incomplete`; otherwise use `facts-unavailable`. A provider engine/protocol failure uses `facts-provider-failed`. The corresponding provider-failure system Finding carries the exit-class consequence without making the skip itself a diagnostic.
  Date/Author: 2026-07-30 / Codex.

- Decision: Treat an evidence-bounded Merman rejection, unsupported format, normalized type disagreement, or unsupported fact profile as unavailable/partial coverage and skips only; treat import/WASM initialization, thrown invocation, or invalid provider protocol as one bounded system Finding per diagram.
  Rationale: parser disagreement is expected from an independent accelerator and cannot invalidate canonical syntax. A broken runtime dependency is a validator system failure and must yield exit `3` rather than a false complete success. Stable codes are `system/facts-initialization-failed`, `system/facts-runtime-failed`, and `system/facts-protocol-error`; raw upstream messages and stacks never cross the adapter.
  Date/Author: 2026-07-30 / Codex.

- Decision: Keep all five new semantic rules warning-enabled by default and configurable through the existing severity/override grammar.
  Rationale: internal version `0.4.0` is the semantic-validator cut, so the feature should be observable without hidden activation. Warnings preserve exit `0` unless a user explicitly configures `error`. Lazy loading still prevents Merman work for invalid or unsupported diagrams, and users can disable individual rules with `off`.
  Date/Author: 2026-07-30 / Codex.

- Decision: Define the initial rule options and behavior exactly as follows: Flowchart isolated-nodes and State unreachable-states accept `{}`; Sequence max-participants accepts `{ max: 10 }`; Pie max-slices accepts `{ max: 8 }`; Class max-members accepts `{ max: 20 }`. Every `max` is a strict positive integer and reports only when the observed count is greater than the configured maximum.
  Rationale: the count rules need deterministic usable defaults and already have a strict positive-integer schema helper. The values are conservative pre-release policy defaults, remain user-configurable, and can evolve before Stage 6 decides public compatibility.
  Date/Author: 2026-07-30 / Codex.

- Decision: Define a Flowchart node as isolated only when it is not the `from` or `to` endpoint of any normalized edge; a self-loop is not isolated. Compute connected components with edges treated as undirected, but do not equate a one-node component with isolation.
  Rationale: connectivity ignores arrow direction, while an incident self-loop is still an explicit relationship. Separating the definitions avoids false positives and provides the connected-component facts requested by the roadmap.
  Date/Author: 2026-07-30 / Codex.

- Decision: For `state/no-unreachable-states`, walk directed transitions from every explicit root initial target, exclude Mermaid pseudo start/end nodes from reports, and require `state.reachability` to be complete. Mark reachability partial for composite states or diagrams without a proven root initial transition during this stage.
  Rationale: deriving entry semantics for nested State documents from flattened relations would manufacture graph completeness. Flat diagrams with explicit `[*] --> State` transitions are evidence-bounded; composite diagrams remain visible through skips until hierarchy/entry semantics are proven.
  Date/Author: 2026-07-30 / Codex.

- Decision: Do not add semantic Finding spans or fixes in Stage 5.
  Rationale: the current Merman evidence provides entities and relations but no proven exact UTF-16 source ranges. Standalone Findings can honestly use document precision, and Markdown already maps them to the responsible block with approximate precision. A lexical identifier search could select comments, labels, or repeated declarations and is not safe enough for edits.
  Date/Author: 2026-07-30 / Codex.

- Decision: Keep JSON `schemaVersion: 2`, add optional per-document `ruleSkips`, add `summary.ruleSkips`, and include skips in nested fix `proposedResult`; do not count skips as Findings or severities.
  Rationale: these are additive private pre-release fields, and existing fields keep their meaning. Fix preview must not lose coverage metadata for the proposed text. Collection `complete` continues to mean no input read/write failure; system fact-provider Findings determine exit `3` through existing error precedence.
  Date/Author: 2026-07-30 / Codex.

- Decision: Append deterministic terminal skip lines after a document's Findings and keep LSP Diagnostics Finding-only.
  Rationale: CLI users need to see incomplete semantic coverage, while LSP has no standard non-diagnostic coverage channel and turning a skip into an informational Diagnostic would conflate validation coverage with a source problem. The accepted LSP state may retain `ValidationResult.ruleSkips`, but Stage 5 adds no custom protocol payload, notification, or `Diagnostic.data`.
  Date/Author: 2026-07-30 / Codex.

- Decision: Preserve the Stage 0 compatibility corpus at exactly 27 fixtures and 108 observations; create Stage 5 product fixtures under `tests/fixtures/semantic-facts/`.
  Rationale: Compatibility Evidence is an independent frozen foundation oracle. Stage 5 needs richer feature/profile and rule behavior fixtures, but changing the old matrix would blur foundation evidence with product acceptance.
  Date/Author: 2026-07-30 / Codex.

- Decision: Change the private package version from `0.3.0` to `0.4.0` only after every Stage 5 exit criterion and both supported-runtime gates pass.
  Rationale: the roadmap defines v0.4 as the five-type semantic validator. Version changes must describe working behavior, not partially implemented modules.
  Date/Author: 2026-07-30 / Codex.

## Outcomes & Retrospective

Implementation has not started. At plan authoring time, the intended outcome is a private `0.4.0` validator with five facts-backed default-warning rules, honest capability-level skip metadata, unchanged official Mermaid syntax authority, no visual stack, and unchanged Stage 0 Compatibility Evidence. Update this section after every major milestone and replace this paragraph with actual commands, counts, limitations, and lessons at closeout.

## Context and Orientation

The repository is one private TypeScript ESM package. At plan-authoring time the checkout is `/Users/wangzhihao/.codex/worktrees/0a41/mermaid-diagram-validator`, Node 24.18.0 is selected by `.nvmrc`, pnpm 10.30.1 is exact-pinned in `package.json`, and the package version is `0.3.0`. The package has CLI and LSP binaries but no supported package-level programmatic exports or declaration output.

A **Document Snapshot** is an immutable in-memory `{ uri, languageId, text, version? }` value. A host document is either standalone Mermaid text or Markdown containing exact-lowercase Mermaid fences. Diagram Validation is the deep module under `src/validation/` that turns a Document Snapshot into a Validation Result. The CLI and LSP are delivery adapters; they import only `src/validation/index.ts` and never import each other.

**Canonical Syntax** is the verdict from exact-pinned official Mermaid 11.16.0. Canonical parsing runs in a serialized child process and returns an internal Syntax Outcome. Official acceptance is required before Semantic Facts are requested. Merman is an independent WASM parser that can expose useful structured objects but is not canonical; Stage 0 records a real false acceptance for an invalid Pie header.

A **Semantic Fact** is a project-owned representation of an entity or relationship in a valid diagram, such as a Flowchart node, a Sequence participant, or a State transition. A **fact capability** names one coherent set of facts. **Coverage** is the adapter's evidence-backed claim for that capability on the current diagram: `complete` means the rule may rely on the full required set, `partial` means some useful facts exist but completeness is unproven, and `unavailable` means no usable set exists. Coverage is not a statement that Merman implements all Mermaid grammar.

A **rule prerequisite** says what must be true before a rule runs. Stage 3 has `text` and `syntax-valid`; Stage 5 adds facts prerequisites. A **Rule Skip** is metadata explaining why an enabled and applicable facts rule did not run. It is not a Finding, has no severity or source span, does not itself affect `valid`, and never offers a fix. A provider infrastructure failure is separate: it produces a system Finding and therefore makes the result invalid and indeterminate.

The current orchestration is in `src/validation/validate-document.ts`. It extracts Markdown diagrams, obtains one Syntax Outcome per diagram, maps the canonical Finding, resolves the complete rule selection, calls `runRules()`, maps diagram-relative rule Findings into host offsets, and combines them into one Validation Result. This plan changes its per-diagram helper to return both Findings and skips while preserving stable diagram order.

The current private Rule Engine is under `src/validation/rules/`. `contracts.ts` owns module/config/report types, `registry.ts` validates built-ins, `run-rules.ts` owns applicability/prerequisite/failure ordering, `options-schema.ts` hides Zod, and `builtins/` contains implementations. `src/validation/rules/index.ts` is the capability seam. `src/validation/index.ts` remains the sole import seam for CLI, LSP, Compatibility Evidence, and public contract tests.

Compatibility Evidence remains under `src/compatibility/`, `fixtures/compatibility/`, and `tests/compatibility/`. It directly observes official Mermaid, mermaid-lint, and Merman in isolated child processes. Product code must never import its contracts, normalizers, adapters, fixtures, or snapshots. The product Merman adapter is deliberately separate and tested against Stage 5 expectations while the old observer remains an independent oracle.

The relevant architecture invariants are mandatory. Official Mermaid remains canonical. Delivery adapters depend inward on Diagram Validation. Raw Merman values never cross the Semantic Facts adapter or Diagram Validation interface. Root Validation imports Canonical Syntax, Markdown, Rules, and Semantic Facts only through each capability's `index.ts`. Rules may consume only project-owned Semantic Facts types through `semantic-facts/index.ts`. Semantic Facts may not import Rules, CLI, LSP, Compatibility Evidence, fixtures, or tests. Only `semantic-facts/merman-adapter.ts` may import `@mermanjs/web`, `node:fs/promises`, or `node:module` for package-relative WASM initialization. No project import cycle is allowed.

The Stage 5 active source structure will add only these product files:

    src/validation/semantic-facts/
      index.ts
      contracts.ts
      graph.ts
      normalize-merman.ts
      merman-adapter.ts

    src/validation/rules/builtins/
      no-isolated-nodes.ts
      max-participants.ts
      max-slices.ts
      max-members.ts
      no-unreachable-states.ts

Do not create `src/facts/`, `src/mcp/`, `src/reporters/`, `src/render/`, `src/geometry/`, `src/vision/`, another package, or future placeholder directories.

## Plan of Work

### Milestone 1: Establish the Stage 5 facts profile and red tests

Begin with evidence rather than product imports. Add repository-local fixtures under `tests/fixtures/semantic-facts/flowchart/`, `sequence/`, `pie/`, `class/`, and `state/`. These fixtures are product evidence and must not change `fixtures/compatibility/`, its manifest length, its snapshot, or the 108-observation matrix.

Flowchart fixtures must include explicit and implicit nodes, an explicit label different from its ID, a modern `@{ shape, label }` node, a self-loop, one isolated node, multiple disconnected components, and a subgraph-related edge case accepted by pinned Mermaid. Sequence fixtures must include explicit participants, implicit actors introduced by messages, aliases, grouping, one diagram at the default limit, and one above it. Pie fixtures must cover title/showData, exactly eight sections, and nine sections. Class fixtures must cover inline and block members, methods, generics, relations, exactly twenty members, and twenty-one members. State fixtures must include a flat reachable graph, a flat graph with an unreachable state, multiple explicit start targets if accepted by Mermaid, a missing-start graph, a terminal pseudo state, and the existing composite-state shape.

First run each new fixture through official Mermaid via the public `validateDocument()` contract or the built CLI so no semantic test is based on invalid syntax. Then add internal adapter contract tests that state the expected project facts and expected coverage for every fixture. The adapter tests must not snapshot or expose the raw Merman object. They must prove that fact arrays and capability coverage are deterministic and sorted.

For the evidence-backed profile, complete coverage requires all of these checks: official Mermaid accepted and supplied one normalized target family; Merman accepted; Merman's normalized type matches the canonical family; the raw top-level and selected child values satisfy the project-owned shape checks; all normalized IDs and relation endpoints are nonempty; and every capability-specific guard passes. Any missing or ambiguous field downgrades only the affected capability. Never default an absent capability entry to complete.

During this milestone, write failing tests for the future Rule Engine behavior using injected facts outcomes: no provider call on canonical rejection, unsupported family, type mismatch, or all semantic rules off; exactly one call for several eligible facts rules; a complete subset can run while another capability skips; deterministic skip fields/order; and one system Finding rather than one per rule for a shared provider engine failure.

Milestone 1 is complete when all new sources are canonical-valid, tests clearly distinguish complete/partial/unavailable coverage, composite State reachability is explicitly partial, and the pre-existing compatibility command still reports exactly 27 fixtures and 108 observations without snapshot change.

### Milestone 2: Add the Semantic Facts capability and Merman runtime adapter

Move `@mermanjs/web@0.7.0` from `devDependencies` to exact-pinned runtime `dependencies` with pnpm and update the lockfile. Keep `@mermaid-lint/core` in `devDependencies`. Update `tests/architecture/engine-versions.test.ts`, `tests/architecture/no-visual-dependencies.test.ts`, and `tests/architecture/module-import-boundaries.test.ts` before product code so the intended ownership is executable.

Update `ARCHITECTURE.md` with the Stage 5 active structure and edges. Root Validation may import `semantic-facts/index.ts`; Rules may type-import that same seam for project-owned contracts; the Semantic Facts subtree may import only within itself. Extend the architecture check's parsed edge model to retain whether an import/export is type-only, allow only a type-only Rules-to-Semantic-Facts edge, and add synthetic rejection of a runtime import through the same seam. Allow `@mermanjs/web`, `node:fs/promises`, and `node:module` only from `src/validation/semantic-facts/merman-adapter.ts` in product code, while preserving existing direct compatibility observers. Add synthetic passing and failing architecture edges for each rule. This activates an already accepted Stage 5 capability and does not require a new ADR unless implementation reverses another dependency, changes the canonical engine, or exposes an upstream type.

Create the five Semantic Facts files named in Context and Orientation. `contracts.ts` defines the version-1 discriminated unions, target family, capability names, coverage entries, provider identity, facts shapes, provider outcomes, and provider function. `graph.ts` provides pure deterministic helpers for undirected connected components, incident-node detection, and directed reachability. `normalize-merman.ts` converts `unknown` raw objects into project-owned facts and coverage; it must be the only product file that knows raw Merman property names. `merman-adapter.ts` owns dynamic import, WASM asset resolution/read, one successful initialization, retry after rejected initialization, `validate()`/`parseObject()` calls, cancellation checks, and bounded outcome classification. `index.ts` re-exports only project-owned contracts, pure operations needed by Rules, and the default provider needed by root Validation.

Normalize each family as follows. Flowchart facts contain sorted `{ id, label }` nodes, sorted endpoint edges, and deterministic connected components; labels fall back to IDs only when the tested Merman shape and Mermaid syntax make that default unambiguous. Sequence facts contain sorted participant IDs and source-order messages normalized to endpoints. Pie facts contain source-order `{ label, value }` sections with finite numeric values. Class facts contain sorted `{ id, memberCount }` entries and sorted relations; memberCount is fields plus methods. State facts contain real state IDs, transitions between real states, explicit root initial targets, and a `hasCompositeStates` marker; root/composite pseudo start/end IDs are not reportable states.

Merman `MERMAN_NO_DIAGRAM`, `MERMAN_UNSUPPORTED_FORMAT`, `MERMAN_PARSE_ERROR`, or normalized type disagreement after official acceptance becomes an `unavailable` outcome with no raw message. Import/WASM failure becomes `engine-failure/initialization`; a thrown validate/parse becomes `engine-failure/runtime`; an invalid adapter return or impossible project invariant becomes `engine-failure/protocol`. Bound every public system message to stable project text. Rethrow only `AbortError`.

Milestone 2 is complete when direct internal tests prove all five fact shapes and coverage decisions, graph helpers handle empty/single/self-loop/disconnected/cyclic cases, a cold adapter initializes from the package WASM, a warm call reuses initialization, an initialization failure can be retried, raw upstream values are absent from serialized outcomes, and architecture tests mechanically enforce every new edge and dependency owner.

### Milestone 3: Extend rule prerequisites, lazy loading, and skip metadata

In `src/validation/rules/contracts.ts`, change `RulePrerequisite` to the union of `"text"`, `"syntax-valid"`, and the facts object defined in Decision Log. Add optional project-owned `facts` to `RuleContext`, but pass it only to a facts rule after every required capability is complete. Define internal `ExecutedRuleSkip` and `RuleExecutionResult` types. Do not export raw facts or provider outcomes through `src/validation/index.ts`.

In `registry.ts`, validate facts prerequisites at registration time. Reject an empty capability list, duplicates, unknown capability names, facts rules without exactly one supported target `diagramTypes` entry, and capability prefixes that do not match that family. Preserve registry order and existing text/syntax rule behavior.

Refactor `run-rules.ts` to accept a lazy facts function only when root Validation can supply one. Continue selection in this order: setting exists and is not `off`; known diagram type is applicable; syntax prerequisite is satisfied; facts prerequisite is evaluated; then the module runs. For the first eligible facts rule, await one memoized provider result. Check cancellation before and after initialization/provider work and before and after each rule. Complete required capabilities pass the immutable project facts to the rule. Partial/unavailable capabilities create one ordered skip for that rule and do not invoke it. A shared provider engine failure creates one bounded system Finding at the first affected registry position and a provider-failed skip for every affected facts rule; later text/syntax rules still run.

Treat an eligible facts rule with no supplied lazy loader as an internal protocol failure: emit `system/facts-protocol-error` once and provider-failed skips for all affected rules. Product validation always supplies the default loader for an accepted target family, so this branch primarily guards direct internal use and future refactors from silently bypassing prerequisites.

Keep existing rule failure isolation and report validation unchanged. A semantic rule rejection still becomes `system/rule-runtime-failed`; an invalid report still becomes `system/rule-protocol-error`. Facts do not allow a rule to override code, severity, source, location precision, or fixes.

In `src/validation/findings.ts`, add the three `system/facts-*` values to `BuiltInFindingCode`, add `RuleSkip` and its reason union, and add optional `ruleSkips` on Validation Result. Refactor the result builder and per-diagram helper in `validate-document.ts` to aggregate both findings and skips. Supply the default Merman provider through `ValidationDependencies` so tests can inject complete, partial, unavailable, failing, delayed, and call-counting providers. Create a loader only for a canonical `accepted` outcome whose normalized type is one of the five target families. Do not call facts for official `unsupported-type`, syntax error, or canonical engine failure.

For Markdown, keep skip `diagramIndex` as the source-order fence index and map only Findings. A locationless semantic Finding maps to the block body as it does today. If Markdown extraction/mapping fails atomically, return the existing extraction system Finding and no stale skips from partially processed blocks.

Milestone 3 is complete when internal and contract tests prove lazy call counts, mixed complete/partial capability behavior, skip omission rules, failure classification, deterministic ordering across multiple Markdown blocks, cancellation, and bit-for-bit preservation of existing outputs when every facts rule is off.

### Milestone 4: Deliver the Flowchart vertical slice through every active surface

Implement `src/validation/rules/builtins/no-isolated-nodes.ts`. Register `flowchart/no-isolated-nodes` after the existing `flowchart/no-markdown-heading-in-label` rule so existing Finding order remains stable. It is a default warning, accepts only `{}`, declares diagram type `flowchart`, and requires `flowchart.nodes` plus `flowchart.edges`. It reports one deterministic Finding per isolated node sorted by ID, truncates any identifier inserted into the message so the existing 500-code-unit report bound is respected, offers help explaining that an isolated node has no incoming or outgoing edge, and returns no span or fix.

Extend `src/cli/terminal-output.ts` to append skips after Findings. Use this stable one-line shape with a one-based display index while retaining the zero-based core index:

    /absolute/path/diagram.mmd: diagram 1 skipped rule flowchart/no-isolated-nodes: facts incomplete (flowchart.edges)

Use `facts unavailable` or `facts provider failed` for the other reasons. Sort capability names, bound the constructed line, and never print raw provider text. A completely valid document with no Finding and no skip remains silent; a valid document with a skip is no longer silent because incomplete validation coverage is actionable.

Extend `src/cli/json-v2-output.ts` to project optional `ruleSkips` on each document and nested `proposedResult`, plus `summary.ruleSkips`. Omit empty document arrays. Keep schema version 2, existing finding/severity counts, collection validity, and exit precedence. Update `docs/reference/json-output-v2.md` only after tests define the final shape.

Add a public validation contract test for standalone and blockquoted Markdown versions of the isolated-node fixture. Both must produce the same rule code/severity/message/type; the standalone Finding has `document` precision and no span, while Markdown maps it to only its Mermaid block with `approximate` precision. Add CLI terminal and JSON real-process tests, default-warning and configured-error cases, `off` behavior proving no Merman call through an injected core test, LSP parity for the Finding, and a fix-planner test proving the semantic warning offers no edit and leaves the document unchanged.

Milestone 4 is complete when the built CLI visibly reports an isolated node, JSON includes no skip for complete Flowchart facts, LSP publishes the equivalent Finding from an unsaved buffer, valid connected/self-loop fixtures remain clean, and no semantic path can change the official syntax Finding for invalid Flowchart source.

### Milestone 5: Add Sequence, Pie, Class, and State rules

Implement the remaining built-ins and register them after both Flowchart rules in roadmap order.

`sequence/max-participants` is a default warning with strict `{ max: positiveInteger }`, default `{ max: 10 }`, family `sequence`, and prerequisite `sequence.participants`. It emits one locationless report when participant count exceeds max and states both values.

`pie/max-slices` is a default warning with strict `{ max: positiveInteger }`, default `{ max: 8 }`, family `pie`, and prerequisite `pie.sections`. One returned section is one slice. It emits one locationless report only above max.

`class/max-members` is a default warning with strict `{ max: positiveInteger }`, default `{ max: 20 }`, family `class`, and prerequisites `class.classes` plus `class.members`. It emits one locationless report per offending class sorted by class ID. Members count both fields and methods exactly once. Bound class IDs in messages.

`state/no-unreachable-states` is a default warning with strict `{}`, family `state`, and prerequisite `state.reachability`. For coverage-complete flat facts, begin at every explicit initial target and walk directed transitions; report each real unreachable state sorted by ID. Do not report root/composite start/end pseudo nodes. A missing explicit root start, composite nesting, malformed endpoint, or any other unproven entry shape makes `state.reachability` partial and produces a skip instead of a Finding.

Use `positiveIntegerOptionsSchema("max")` for the three count rules. Extend configuration and LSP initialization tests to prove known IDs, strict tuples, defaults, overrides, `off`, error severity, zero/negative/noninteger rejection, and preservation of unrelated rule settings. Add focused rule tests at `max - 1`, `max`, and `max + 1`, deterministic multiple-Class output, disconnected/cyclic State behavior, multiple initial states, and composite/missing-start skips.

Add public contract tests covering all five families as standalone and Markdown. Add CLI JSON and LSP parity with configured thresholds small enough to trigger compact fixtures. Ensure semantic Findings remain warnings by default, become errors only by configuration, and never offer fixes. Ensure a Merman disagreement or partial capability never changes a canonical Finding or suppresses a text/syntax rule that can still run.

Milestone 5 is complete when each target family has a real-adapter contract test, at least one default registered rule, strict configuration docs/tests, a positive and negative semantic case, Markdown host behavior, and explicit incomplete-facts coverage.

### Milestone 6: Prove operational behavior, failure isolation, and performance

Add real and injected failure tests. Initialization failure, thrown provider invocation, and malformed provider outcomes must yield exactly one matching `system/facts-*` Finding per affected diagram, provider-failed skips for every affected facts rule, exit `3` in CLI, bounded messages, and no raw stack/path/WASM detail. An official-valid source rejected only by Merman must remain canonically accepted, record unavailable skips, and produce no facts system Finding. Official-invalid Pie header must prove the facts provider was never called.

Add cancellation/race tests with an injected delayed provider. Abort before load and abort after the provider settles must reject with `AbortError`. LSP edit/close during facts work must not publish or cache a stale result, even when an injected provider ignores cancellation; the existing generation checks remain authoritative. The default synchronous Merman parse is checked before and after but is not claimed preemptible.

Extend the opt-in LSP performance characterization to record a canonically valid facts-triggering Flowchart cold first diagnostic and warm same-process edits. Record Mermaid worker startup, Merman initialization reuse, source UTF-16 size, rule selection, Node, pnpm, commit, and cold/warm samples. Do not create a CI wall-clock threshold. If the direct adapter causes repeated process instability or clear event-loop starvation in the bounded fixture, reopen the in-process decision before closeout; do not silently weaken debounce, parser deadlines, or test timeouts.

Run the ordinary and compatibility suites under Node 24.18.0 and one supported Node 22 release. Preserve `fileParallelism: false`, the 20-second ordinary test timeout, the canonical parser's 10-second product deadline, the no-retry policy, and the existing one opt-in performance skip. Do not update compatibility snapshots unless a separately reviewed foundation change is intentional; Stage 5 should require no such change.

Milestone 6 is complete when both runtimes pass the complete gate, both compatibility gates still report 27/108, real CLI and LSP behavior match core Findings, skip metadata is deterministic, no provider failure is silent, and performance evidence is recorded without an invented SLA.

### Milestone 7: Document and close Stage 5 without entering Stage 6

Create `docs/reference/semantic-facts-and-rules.md`. Define canonical-versus-facts roles, every capability and coverage status, all five rules/defaults/options, skip reasons, State composite limitation, location precision, no-fix policy, and configuration examples. Update `docs/reference/rules-and-fixes.md`, `configuration.md`, `json-output-v2.md`, and `language-server.md` so each active adapter's behavior is explicit. The LSP reference must say semantic Findings are Diagnostics but Rule Skips are not sent over LSP.

Update `README.md` from Stage 4 to Stage 5, remove Semantic Facts from the deferred list, add one concise semantic CLI/config example, explain terminal skip lines, and retain all diagnostic-usability text. Update `ARCHITECTURE.md` with the implemented Stage 5 tree, dependency direction, runtime data flow, external ownership, and actual gate evidence. Update `DRAFT-PLAN.md` only after all exit criteria pass: mark Stage 5 complete, record actual test/runtime/compatibility evidence, retain Stage 6 as not started, and leave the visual roadmap deferred.

Change package and CLI version surfaces to `0.4.0` only at closeout. Keep `private: true`, no `exports`, no declaration output, no optional dependencies, and no package split. Update this plan's Progress, Surprises & Discoveries, Decision Log, Outcomes & Retrospective, Artifacts, actual counts, and a dated Revision Note. Stop before SARIF, JUnit, GitHub Action, MCP, public plugin/API stabilization, installed-package smoke tests, or any visual dependency.

## Concrete Steps

Run all commands from the repository root. At plan-authoring time that root is:

    cd /Users/wangzhihao/.codex/worktrees/0a41/mermaid-diagram-validator

The repository imports `/Users/wangzhihao/.codex/RTK.md`, so prefix shell commands with `rtk`. Use pnpm only. Do not use npm, yarn, npx, Bun, or Python for product/runtime work.

Before editing, establish the exact checkout and preserve user work:

    rtk git status --short --branch
    rtk git rev-parse HEAD
    rtk node --version
    rtk pnpm --version
    rtk pnpm install --frozen-lockfile
    rtk pnpm list --depth 0

Expect the implementation baseline to be commit `1c199d0` or a documented descendant, Node 24.18.0 or a supported Node 22 runtime, pnpm 10.30.1, a private 0.3.0 package, and no unrelated worktree mutation. If the checkout has moved, use its actual repository root and record the new baseline here. If frozen installation needs network or a noninteractive reinstall, obtain the required environment authorization rather than changing package manager or lockfile semantics.

Run the pre-change gates and record their actual counts:

    rtk proxy pnpm typecheck
    rtk pnpm check
    rtk pnpm compatibility

The last checked-in evidence is 31 ordinary test files / 281 passed tests with one opt-in performance test skipped, and 4 compatibility files / 16 tests with 27 fixtures / 108 observations. Treat those counts as historical until this checkout reruns them successfully.

Move the already evaluated Merman pin into runtime dependencies:

    rtk pnpm add --save-prod --save-exact @mermanjs/web@0.7.0
    rtk pnpm list --depth 0
    rtk pnpm why @mermanjs/web

Inspect `package.json` and `pnpm-lock.yaml`. There must be one effective Merman 0.7.0, it must be a direct runtime dependency, and no unrelated version may change.

Use focused red-green loops while adding the capability. The intended test paths are:

    rtk pnpm exec vitest run tests/architecture
    rtk pnpm exec vitest run tests/internal/validation/semantic-facts
    rtk pnpm exec vitest run tests/internal/validation/rules
    rtk pnpm exec vitest run tests/contract/validation/semantic-facts-and-rules.test.ts
    rtk pnpm exec vitest run tests/unit/cli/config.test.ts tests/unit/cli/reporters.test.ts
    rtk pnpm exec vitest run tests/integration/cli/cli.test.ts
    rtk pnpm exec vitest run tests/integration/lsp/parity.test.ts tests/integration/lsp/lsp.test.ts

If the local Corepack/pnpm shim cannot run `pnpm exec`, use the repository script form after the frozen install or repair the exact pnpm 10.30.1 environment; do not substitute another package manager. When an RTK-filtered TypeScript command emits `.js` or `.js.map` beside source, stop, inspect status, remove only the generated artifacts by explicit path, and use `rtk proxy pnpm typecheck` thereafter as recorded by the Stage 3/4 plans.

Exercise the first user-visible slice with a temporary repository-local or `/tmp` source containing:

    flowchart LR
      A
      B --> C

After build, run:

    rtk pnpm build
    rtk node dist/cli/main.js /tmp/isolated.mmd
    rtk node dist/cli/main.js --format json /tmp/isolated.mmd

The terminal output must contain one warning `flowchart/no-isolated-nodes` naming `A`, with document-level location semantics and no `[fixable]` marker. JSON must contain the same Finding, no `ruleSkips`, and `summary.ruleSkips: 0`.

Exercise a coverage skip with a canonical-valid composite State fixture:

    rtk node dist/cli/main.js tests/fixtures/semantic-facts/state/composite.mmd
    rtk node dist/cli/main.js --format json tests/fixtures/semantic-facts/state/composite.mmd

The terminal output must say diagram 1 skipped `state/no-unreachable-states` because `state.reachability` is incomplete. JSON must contain one `ruleSkips` entry, no unreachable-state Finding, a `summary.ruleSkips` count of one, and a canonically valid document unless another enabled rule reports an error.

Exercise strict configuration with a temporary `mermaid-validator.config.json`:

    {
      "rules": {
        "flowchart/no-isolated-nodes": "error",
        "sequence/max-participants": ["warning", { "max": 3 }],
        "pie/max-slices": ["warning", { "max": 4 }],
        "class/max-members": ["warning", { "max": 5 }],
        "state/no-unreachable-states": "warning"
      }
    }

An isolated Flowchart configured as error must exit `1`. A facts provider initialization/runtime/protocol fixture injected through tests must exit `3`. `off` must suppress both execution and skip metadata for that rule.

Run the opt-in profile only for characterization:

    rtk proxy env MERMAID_VALIDATOR_LSP_PROFILE=1 pnpm exec vitest run tests/integration/lsp/performance.test.ts --reporter=verbose

Record cold and warm samples but do not turn them into pass/fail timing thresholds beyond the existing bounded test process.

Before closeout, run the full matrix without parallel full gates:

    rtk pnpm install --frozen-lockfile
    rtk proxy pnpm typecheck
    rtk pnpm check
    rtk pnpm compatibility
    rtk pnpm hygiene
    rtk git diff --check
    rtk git status --short --untracked-files=all

Repeat `pnpm check` and `pnpm compatibility` under Node 24.18.0 and one supported Node 22 release. Record exact versions, durations, file/test counts, the one intentional performance skip, and the unchanged 27/108 compatibility result in this plan and `ARCHITECTURE.md`. Do not claim hosted CI or cross-platform evidence unless it actually ran.

## Validation and Acceptance

Stage 5 is accepted only when all behavior below is observable.

Official Mermaid remains the sole syntax verdict. Every pre-existing valid/invalid fixture preserves its canonical acceptance, code, engine name/version, and exit class. The invalid Pie header that Merman historically accepted never invokes the facts provider after official rejection. A Merman rejection or type disagreement on officially accepted syntax cannot add or remove a Mermaid Finding.

Every target family has a project-owned version-1 fact shape, deterministic coverage entries, a real exact-pinned Merman adapter test, and at least one built-in rule. Raw Merman objects, package types, WASM paths, upstream error strings, and stacks do not appear in `src/validation/index.ts`, Validation Result, JSON, LSP, snapshots, or terminal output.

Facts loading is lazy and per diagram. With all facts rules off, validation produces the same result as the pre-Stage-5 surface and does not initialize Merman. Invalid syntax, unsupported diagram families, and type-mismatched rules do not call Merman. Multiple applicable semantic rules on one diagram share exactly one provider result.

Coverage gates are honest. A rule runs only when every declared capability is complete. A complete subset can support one rule while another skips. Composite State reachability and missing-root-start State diagrams skip `state/no-unreachable-states` rather than reporting nested/entry false positives. Skips are ordered by diagram and registry, omitted when empty, never counted as Findings, never offer fixes, and do not affect validity by themselves.

Provider infrastructure failures are not silent. Initialization, runtime, and protocol failures produce the matching bounded `system/facts-*` code exactly once per affected diagram, create provider-failed skips for affected rules, preserve later rule isolation, yield CLI exit `3`, and publish a system Diagnostic through LSP. Expected provider disagreement/incomplete coverage produces skips without a system Finding.

The five semantic rules satisfy their exact definitions. `flowchart/no-isolated-nodes` reports degree-zero nodes but not self-loops. Count rules respect strict positive integer max options and report only above the threshold. `class/max-members` counts fields plus methods and orders multiple classes deterministically. `state/no-unreachable-states` uses directed reachability from explicit initial targets and excludes pseudo states.

Standalone and Markdown behavior agree on code, severity, message, diagram type, and order. Locationless standalone semantic Findings use document precision with no span. Markdown maps them to only the responsible Mermaid block with approximate precision and host-bounded spans. CLI and LSP Findings remain equivalent; LSP sends no custom Rule Skip diagnostic or protocol extension.

Terminal output prints Findings first and deterministic skip lines second. Valid documents with no Findings or skips remain silent. JSON-v2 keeps schema version 2, existing field meanings, and severity counts; it adds omitted-when-empty document `ruleSkips`, nested proposed-result skips, and `summary.ruleSkips`. Fix planning remains safe and semantic rules offer no candidate edit.

Architecture tests prove the Semantic Facts seam, Rules-to-fact-contract edge, upstream ownership, filesystem asset-read exception, no cycles, private package status, exact direct pins, and absence of later/visual modules and dependencies. Product code never imports Compatibility Evidence. The Stage 0 matrix remains 27 fixtures / 108 observations and its snapshot does not change.

The final private version is `0.4.0`. `pnpm check`, `pnpm compatibility`, hygiene, and diff checks pass on Node 24.18.0 and a supported Node 22 runtime. `DRAFT-PLAN.md` marks Stage 5 complete only after this evidence; Stage 6 and visual work remain not started.

## Idempotence and Recovery

Fixture creation, source edits, builds, and tests are safe to repeat. Use `pnpm install --frozen-lockfile` after the intentional manifest/lockfile update so later registry drift cannot rewrite the resolved graph. Do not run compatibility snapshot update as a repair; Stage 5 expects no matrix change.

If Merman cannot initialize after moving it to runtime dependencies, first verify the exact installed package and package-relative WASM path. Do not copy the WASM into source, download an alternate binary, loosen package exports, or fall back to Merman rendering. Keep the failure bounded through the adapter, record the evidence in Surprises & Discoveries, and resolve the package-owned asset loading inside the adapter.

If a new valid syntax profile does not yield complete facts, downgrade only the affected capability and keep the rule skipped. Do not implement a broad regex parser to force completeness, do not call Mermaid internal diagram databases, and do not let Merman decide canonical syntax. If the Stage 5 exit criterion truly cannot be met for one initial rule, record the exact fixture/provider gap and revise this plan and `DRAFT-PLAN.md` with the user before substituting another dependency or changing scope.

If the direct Merman adapter shows unacceptable process behavior, do not hide it with larger debounce/test timeouts or retries. Preserve the failing fixture and measurement, then update this plan and architecture before adding a killable worker. Stage 6 still owns general process time/memory policy.

Failed initialization may be retried because the adapter clears its rejected initialization promise. Successful initialization is reused. Provider calls do not mutate documents or files. CLI `--fix` semantics remain document-local and recoverable through version control exactly as Stage 3 defines.

Generated `dist/` and test temporary directories may be regenerated. Never use `git reset --hard`, `git checkout --`, or broad recursive cleanup. Preserve unrelated user changes, remove only known generated source artifacts by explicit paths if RTK/typecheck creates them, and do not commit, tag, push, publish, or open a PR unless the user separately asks.

## Artifacts and Notes

The final public skip metadata for one incomplete composite State diagram should resemble:

    {
      "ruleId": "state/no-unreachable-states",
      "diagramIndex": 0,
      "diagramType": "state",
      "reason": "facts-incomplete",
      "requiredCapabilities": ["state.reachability"],
      "unavailableCapabilities": ["state.reachability"]
    }

The corresponding terminal line should resemble:

    /workspace/composite.mmd: diagram 1 skipped rule state/no-unreachable-states: facts incomplete (state.reachability)

A Flowchart isolated-node Finding should resemble:

    {
      "code": "flowchart/no-isolated-nodes",
      "severity": "warning",
      "message": "Flowchart node A is isolated",
      "source": "rule",
      "locationPrecision": "document",
      "diagramType": "flowchart",
      "help": "Connect the node with at least one incoming or outgoing edge"
    }

At closeout, replace this placeholder with actual transcripts:

    $ pnpm check
    Test Files  <actual passed> | 1 skipped
    Tests       <actual passed> | 1 skipped

    $ pnpm compatibility
    Compatibility summary: 27 fixtures, 108 observations
    Merman facts: complete 12/12; partial 0; unavailable 0
    Test Files  4 passed (4)
    Tests       16 passed (16)

    $ node dist/cli/main.js /tmp/isolated.mmd
    /tmp/isolated.mmd: warning flowchart/no-isolated-nodes [document]: Flowchart node A is isolated
       | location applies to the document
       | help: Connect the node with at least one incoming or outgoing edge

## Interfaces and Dependencies

In `src/validation/semantic-facts/contracts.ts`, define project-owned interfaces equivalent to the following. Exact readonly container refinements are allowed; upstream types and arbitrary raw payloads are not.

    export type TargetDiagramType =
      | "flowchart"
      | "sequence"
      | "pie"
      | "class"
      | "state";

    export type SemanticFactCapability =
      | "flowchart.nodes"
      | "flowchart.labels"
      | "flowchart.edges"
      | "flowchart.connected-components"
      | "sequence.participants"
      | "sequence.messages"
      | "pie.sections"
      | "class.classes"
      | "class.members"
      | "class.relations"
      | "state.states"
      | "state.transitions"
      | "state.reachability";

    export type FactCoverageStatus = "complete" | "partial" | "unavailable";

    export interface FactCoverage {
      readonly capability: SemanticFactCapability;
      readonly status: FactCoverageStatus;
    }

    export interface EndpointPair {
      readonly from: string;
      readonly to: string;
    }

    export type SemanticFacts =
      | {
          readonly type: "flowchart";
          readonly nodes: readonly { readonly id: string; readonly label: string }[];
          readonly edges: readonly EndpointPair[];
          readonly connectedComponents: readonly (readonly string[])[];
        }
      | {
          readonly type: "sequence";
          readonly participantIds: readonly string[];
          readonly messages: readonly EndpointPair[];
        }
      | {
          readonly type: "pie";
          readonly sections: readonly { readonly label: string; readonly value: number }[];
        }
      | {
          readonly type: "class";
          readonly classes: readonly { readonly id: string; readonly memberCount: number }[];
          readonly relations: readonly EndpointPair[];
        }
      | {
          readonly type: "state";
          readonly stateIds: readonly string[];
          readonly transitions: readonly EndpointPair[];
          readonly initialStateIds: readonly string[];
          readonly hasCompositeStates: boolean;
        };

    export interface SemanticFactsEnvelope {
      readonly schemaVersion: 1;
      readonly diagramType: TargetDiagramType;
      readonly provider: { readonly name: "merman"; readonly version: "0.7.0" };
      readonly coverage: readonly FactCoverage[];
      readonly facts: SemanticFacts;
    }

    export type SemanticFactsOutcome =
      | { readonly kind: "available"; readonly value: SemanticFactsEnvelope }
      | {
          readonly kind: "unavailable";
          readonly diagramType: TargetDiagramType;
          readonly provider: { readonly name: "merman"; readonly version: "0.7.0" };
          readonly coverage: readonly FactCoverage[];
          readonly reason: "provider-rejected" | "type-mismatch" | "unsupported-profile";
        }
      | {
          readonly kind: "engine-failure";
          readonly failure: "initialization" | "runtime" | "protocol";
          readonly message: string;
        };

    export type SemanticFactsProvider = (
      source: string,
      options: {
        readonly diagramType: TargetDiagramType;
        readonly signal?: AbortSignal;
      },
    ) => Promise<SemanticFactsOutcome>;

The envelope invariant is `facts.type === diagramType`. Coverage has exactly one sorted entry for every capability in that family; no duplicate or foreign capability is valid. `available` may contain partial coverage so one rule can run while another skips. `unavailable` marks all family capabilities unavailable and carries no facts.

In `src/validation/rules/contracts.ts`, define the new prerequisite and execution shapes equivalent to:

    export type RulePrerequisite =
      | "text"
      | "syntax-valid"
      | {
          readonly kind: "facts";
          readonly capabilities: readonly SemanticFactCapability[];
        };

    export interface RuleContext<Options> {
      readonly source: string;
      readonly documentUri: string;
      readonly diagramIndex: number;
      readonly diagramType?: string;
      readonly options: Options;
      readonly facts?: SemanticFacts;
      readonly signal?: AbortSignal;
    }

    export interface ExecutedRuleSkip {
      readonly ruleId: string;
      readonly diagramIndex: number;
      readonly diagramType: TargetDiagramType;
      readonly reason: "facts-incomplete" | "facts-unavailable" | "facts-provider-failed";
      readonly requiredCapabilities: readonly SemanticFactCapability[];
      readonly unavailableCapabilities: readonly SemanticFactCapability[];
    }

    export interface RuleExecutionResult {
      readonly findings: readonly ExecutedRuleFinding[];
      readonly skips: readonly ExecutedRuleSkip[];
    }

`runRules()` additionally accepts an optional lazy `loadFacts` callback supplied by root Validation. It must memoize the first call per diagram. A facts rule receives facts only after the engine verifies every required coverage entry is complete. If an eligible facts rule is reached without a loader, return one facts protocol system Finding and provider-failed skips rather than calling the rule.

In `src/validation/findings.ts`, add the root result type equivalent to:

    export interface RuleSkip {
      readonly ruleId: string;
      readonly diagramIndex: number;
      readonly diagramType: "flowchart" | "sequence" | "pie" | "class" | "state";
      readonly reason: "facts-incomplete" | "facts-unavailable" | "facts-provider-failed";
      readonly requiredCapabilities: readonly string[];
      readonly unavailableCapabilities: readonly string[];
    }

    export interface ValidationResult {
      readonly documentUri: string;
      readonly documentVersion?: number;
      readonly diagramCount: number;
      readonly valid: boolean;
      readonly findings: readonly Finding[];
      readonly ruleSkips?: readonly RuleSkip[];
    }

Export `RuleSkip` through `src/validation/index.ts` because it is reachable from Validation Result. Do not export Semantic Facts, provider outcomes, RuleModule, Merman types, raw objects, or the local adapter through the root seam.

The direct dependency profile at Stage 5 closeout must include these exact runtime pins:

    commander                         15.0.0
    globby                            16.2.2
    jsdom                             26.1.0
    mdast-util-from-markdown          2.0.3
    mermaid                           11.16.0
    @mermanjs/web                     0.7.0
    vscode-languageserver             10.1.0
    vscode-languageserver-textdocument 1.0.12
    zod                               4.4.3

Keep `@mermaid-lint/core@0.35.0`, TypeScript, Vitest, and type packages as exact development dependencies. Do not add `@mermaid-js/parser`, Mermaid CLI, a graph library, a worker library, AJV, another schema package, a renderer, browser binary, image package, geometry/layout package, vision provider, SARIF/JUnit package, MCP package, or public plugin loader.

## Revision Note

2026-07-30 / Codex: Created the initial self-contained Stage 5 ExecPlan from detached commit `1c199d0`. The plan preserves completed Stage 4 diagnostic hardening, defines capability-level Semantic Facts coverage and observable skips, confines exact-pinned Merman to a local runtime adapter, sequences a Flowchart vertical slice before the other four families, fixes initial rule defaults and State reachability limits, preserves the 27-fixture/108-observation Stage 0 matrix, and prohibits Stage 6 or visual work. Implementation remains unstarted.
