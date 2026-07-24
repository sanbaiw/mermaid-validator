# Deliver Stage 3 custom rules and safe fixes

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` is the authority for Stage 3 scope and exit criteria, `ARCHITECTURE.md` is the authority for module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes official Mermaid as the sole canonical syntax authority. This plan repeats the Stage 3 rules needed for implementation so that a contributor can execute it from this file and the current working tree without relying on previous plans.

## Purpose / Big Picture

After Stage 3, a user can run the repository-aware validator and receive configurable lint Findings in addition to canonical Mermaid syntax Findings. The first built-in rule, `flowchart/no-markdown-heading-in-label`, detects heading markers inside Flowchart Markdown String node labels. It is enabled as a warning by default, can be changed or disabled globally or for matching files, and offers a bounded edit that removes only the heading marker. A user can inspect fixes without writing through `--fix-dry-run`, or apply only conflict-free, canonical, idempotent fixes through `--fix`.

The differentiating behavior is visible from the built CLI. Given a valid Flowchart containing `A["\`# Build\`"]`, ordinary validation reports one warning and exits `0`; configuring the rule as an error makes the same command exit `1`; `--fix-dry-run --format json` returns the proposed fixed text without changing the file; and `--fix` changes the label to `A["\`Build\`"]`, revalidates it, and exits `0`. A repository-local fixture rule also registers through the candidate rule seam without changing a built-in rule union, proving that the private design can evolve into a supported plugin API in Stage 6.

This stage does not publish a package API. It does not load arbitrary JavaScript plugins from user configuration, add Semantic Facts, add the LSP, change the canonical parser, or activate rendering, geometry, image, layout, or model-based review.

## Progress

- [x] (2026-07-22 19:46Z) Read `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 2 plan, current validation/CLI/config/reporting code, architecture checks, and current dependency manifests.
- [x] (2026-07-22 19:46Z) Verified the Stage 2 baseline on Node 22.20.0 and pnpm 10.30.1: `pnpm check` passed 20 test files and 122 tests; `pnpm compatibility` passed 4 files and 16 tests with the unchanged 27-fixture/108-observation summary.
- [x] (2026-07-22 19:46Z) Resolved the initial Stage 3 contract in this plan, including rule registration, configuration/override ownership, suppression scope, prerequisite skips, fix projection, conflict policy, dry-run output, and idempotence checks.
- [x] (2026-07-22 20:02Z) Completed an independent reviewer-agent design-intent pass and incorporated all six findings: sparse override patches, unconditional pre/post fix safety gates, whole-selection idempotence, explicit multi-file application state, applicability-before-prerequisite ordering, and temporary-copy manual fix commands.
- [x] (2026-07-22 20:08Z) Completed the reviewer's focused follow-up and removed two remaining ambiguities: original syntax errors keep their original exit class in fix mode, and dry-run separates original-file results from nested proposed-output results.
- [x] (2026-07-25) Agreed to extend the existing Vitest/TypeScript AST architecture check only with load-bearing Stage 3 enforcement: project-cycle detection, the Compatibility Evidence seam, the Rules seam, comparison-engine ownership, filesystem/process isolation, and single-file Zod ownership; no replacement checker, dependency, or standalone `pnpm architecture` command.
- [x] (2026-07-25) Classified malformed or unknown inline suppressions as document-authored rule errors (`mermaid-validator/invalid-suppression`, exit `1`) rather than validator infrastructure failures; config-file rule errors remain CLI input errors with exit `2`.
- [x] (2026-07-25) Confirmed that Stage 3 retains diagram-wide suppression comments as the only local-exception mechanism; line/range/next-line suppression and disable/enable pairs remain deferred.
- [x] (2026-07-25) Reconsidered and superseded the preceding suppression decisions: Stage 3 will not parse rule-control comments from Mermaid source. Rule disabling is config-only through base `off` settings and per-file overrides; one-shot CLI disable flags are deferred until a real use case establishes their precedence requirements.
- [x] (2026-07-25) Agreed to update `ARCHITECTURE.md` inside Milestone 1 after dependency/boundary tests exist but before Stage 3 product code: replace the Stage 2 tree, add Rules/fix boundaries, describe the existing focused checker, and remove the stale Stage 0 transition; closeout updates only final status and evidence.
- [x] (2026-07-25) Deferred user-visible rule-skip metadata until Stage 5. Stage 3 still enforces and tests prerequisites internally, but does not add `ruleSkips` to `ValidationResult`, JSON, or Markdown host mapping.
- [x] (2026-07-25) Deferred the `facts` prerequisite itself until Stage 5. Stage 3 exposes only `text | syntax-valid`; Stage 5 adds `facts`, completeness handling, and observable skip metadata as one coherent contract.
- [x] (2026-07-25) Confirmed `zod@4.4.3` as the sole Stage 3 dependency for strict rule-option/config validation, isolated behind the project-owned `src/validation/rules/options-schema.ts` seam.
- [x] (2026-07-25) Confirmed that Stage 3 proves only a repository-private custom-rule registration seam with an external-style fixture; package exports, configuration-supplied modules, dynamic loading, and public compatibility commitments remain deferred until Stage 6.
- [x] (2026-07-25) Replaced collection-wide fix preflight blocking with file-level isolation: an unsafe/conflicting/non-idempotent document remains unchanged, while other safely planned documents may still be written; aggregate exit precedence is unchanged.
- [x] (2026-07-25) Extended file-level isolation through the filesystem boundary: a bounded write failure leaves that document unchanged as reported and does not prevent later safe documents from being attempted; removed the `not-attempted` state.
- [x] (2026-07-25) Collapsed user-visible fix state to one `fix.status` (`unchanged | previewed | applied | blocked | write-failed`); detailed `DocumentFixStatus` remains internal and failure Findings carry the reason.
- [ ] Add the exact Stage 3 dependency and architecture/test guardrails without entering a later stage.
- [ ] Implement the private rule registry, option schemas, configuration resolution, and per-file overrides.
- [ ] Integrate asynchronous rule execution and internal prerequisite gating into standalone and Markdown Diagram Validation.
- [ ] Implement `flowchart/no-markdown-heading-in-label` with a bounded scanner and host-safe fixes.
- [ ] Implement in-memory fix planning, CLI dry-run/application modes, deterministic output, and write-error handling.
- [ ] Update user/reference/architecture/roadmap documentation and pass the full Node 22/24 acceptance gates.

## Surprises & Discoveries

- Observation: The current Stage 2 checkout is ahead of its recorded 120-test closeout and passes 122 tests across the same 20 files.
  Evidence: Planning-time `pnpm check` on Node 22.20.0 ended with `Test Files 20 passed (20)` and `Tests 122 passed (122)`.

- Observation: The current config parser is intentionally strict and accepts only `ignore`; rule settings cannot be bolted on after discovery without changing the config contract and its tests.
  Evidence: `src/cli/config.ts` rejects every key other than `ignore`, while `runCli()` loads config before discovery and creates Document Snapshots only after successful discovery.

- Observation: Stage 1 already left `Finding.code` open as `string` even though built-in system/Mermaid codes have a closed helper union.
  Evidence: `src/validation/findings.ts` declares `Finding.code: string`, so an external-style rule can use a namespaced code without editing `BuiltInFindingCode`.

- Observation: Mermaid 11.16.0 Markdown Strings are delimited by double quotes plus backticks, and modern Flowchart shapes use an attribute object with a `label` field. The first rule therefore needs a small lexical state machine rather than a shape-specific regular expression.
  Evidence: The official Flowchart syntax documents the `A["\`...\`"]` form, and the pinned Mermaid distribution includes modern `A@{ shape: ..., label: "..." }` examples and parsing support.

- Observation: Zod is not already present directly or transitively in the frozen lockfile.
  Evidence: Planning-time searches of `pnpm-lock.yaml` and `node_modules/.pnpm/lock.yaml` found no Zod entry. The accepted Stage 3 pin must therefore be added explicitly and reviewed in the lockfile.

## Decision Log

- Decision: Put the Stage 3 rule capability under `src/validation/rules/`, with `src/validation/rules/index.ts` as its internal seam; do not create a top-level `src/rules/` directory.
  Rationale: Rules, prerequisites, and fix safety are owned by the Diagram Validation bounded context. This preserves the accepted inward dependency direction and keeps rule internals unavailable to CLI and future delivery adapters.
  Date/Author: 2026-07-22 / Codex.

- Decision: Extend the existing Vitest/TypeScript AST architecture check instead of restoring the retired standalone checker or adding another static-analysis dependency. The Stage 3 increment must detect project import cycles; restrict Compatibility Evidence to its own subtree plus `src/validation/index.ts`; keep Rules inside their subtree and away from CLI, Compatibility Evidence, Canonical Syntax/Markdown internals, filesystem/process APIs, `@mermaid-lint/core`, and Merman; and allow Zod only in `src/validation/rules/options-schema.ts`.
  Rationale: These are the current graph edges whose violation would undermine the Stage 3 registration seam or create runtime-cycle risk. The focused architecture suite is already part of `pnpm check` and is fast, so expanding its fail-closed policy preserves velocity without introducing a second harness or speculative later-stage enforcement.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Update `ARCHITECTURE.md` during Milestone 1 after dependency and boundary tests are established but before Stage 3 product implementation. Replace the Stage 2 active tree with the Stage 3 tree, add the Rules and in-memory fix-planning boundaries, describe the focused checker that already runs in `pnpm check`, and remove the obsolete Stage 0 `src/spike/`/`src/adapters/` transition. Stage 3 closeout updates only completion status and final evidence.
  Rationale: Architecture is the authority used while placing code, so it must describe the active boundaries before product files are added. Keeping the update narrow avoids both implementation/document drift and an unrelated architecture rewrite. The accepted dependency direction does not change, so no ADR is required.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Keep the candidate registration seam repository-private through Stage 5 and prove it with a test fixture rather than a user-supplied module path.
  Rationale: Stage 3 must prove that registration is open without taking on package exports, arbitrary-code loading, plugin discovery, security policy, or migration promises. Stage 6 owns publication and supported package interfaces.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Use namespaced rule identifiers matching `^[a-z][a-z0-9-]*/[a-z][a-z0-9-]*$`, require uniqueness, and reserve the `mermaid` and `system` namespaces.
  Rationale: A stable Finding code must identify its owner and cannot collide with canonical or system diagnostics. Registration-time validation replaces a closed union while still rejecting ambiguous identifiers.
  Date/Author: 2026-07-22 / Codex.

- Decision: Exact-pin `zod@4.4.3` as a runtime dependency and import it only in `src/validation/rules/options-schema.ts`.
  Rationale: Stage 3 is the point where per-rule option schemas justify a schema library and using it is faster than growing handwritten strict validators. A single local adapter prevents Zod objects/errors from crossing Diagram Validation or rule-module seams and preserves exact dependency ownership.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: The project-owned `RuleOptionsSchema<T>` seam is structural and returns a bounded project result; it does not expose a Zod type.
  Rationale: Built-ins can use Zod through the local adapter, while the external-style fixture proves that registration is not coupled to an upstream schema type. Raw Zod issues remain implementation detail.
  Date/Author: 2026-07-22 / Codex.

- Decision: Configure severities as `off`, `warning`, or `error`, matching the existing `Finding.severity` vocabulary. A rule setting may be a severity string or a two-element `[severity, options]` tuple.
  Rationale: This avoids a `warn`-to-`warning` translation in the private config contract and gives every rule one predictable location for typed options. `off` prevents execution and does not create a skip record.
  Date/Author: 2026-07-22 / Codex.

- Decision: Enable `flowchart/no-markdown-heading-in-label` as `warning` by default with strict empty options.
  Rationale: Stage 3 should expose useful behavior without requiring configuration while preserving exit `0` for a style warning. The empty schema proves the option path and rejects accidental unsupported settings.
  Date/Author: 2026-07-22 / Codex.

- Decision: Keep config discovery and path matching in CLI. `rules` and every override are validated sparse patches; matching overrides apply in declaration order and later explicit settings win per rule; built-in defaults are materialized exactly once after layering.
  Rationale: Filesystem paths and config-root-relative globs belong to a delivery adapter. Distinguishing sparse patches from the complete selection prevents an override from resetting an unrelated base rule to its default. Diagram Validation receives one already validated, path-resolved complete selection for a Document Snapshot and remains suitable for unsaved LSP buffers later.
  Date/Author: 2026-07-22 / Codex.

- Decision: Use Node's `path.matchesGlob()` for override matching and the same bounded forward-slash pattern grammar already used for Stage 2 ignores. Do not add another glob dependency.
  Rationale: The supported Node floor already contains `matchesGlob`, per-file matching does not need discovery semantics, and one built-in avoids exposing Globby or adding Minimatch/Picomatch ownership. Files outside the config root receive base rules only.
  Date/Author: 2026-07-22 / Codex.

- Decision: Defer every source-embedded rule suppression syntax and one-shot CLI disable flag from Stage 3. Mermaid comments remain ordinary Mermaid source and the validator does not interpret them as rule-control directives. Rule disabling is config-only through base `off` settings and per-file overrides.
  Rationale: Source suppression introduces a second language with placement, quoting, malformed-directive, mapping, and skip-observability contracts that do not help prove the first rule/fix seam. A CLI flag would add unresolved precedence against base config, ordered overrides, repeated flags, and fix modes. Deferring both reduces implementation and test surface while keeping the existing configuration path for intentional exceptions.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Stage 3 supports only `text` and `syntax-valid` prerequisites. Add `facts` in Stage 5 together with completeness handling and user-visible skip metadata.
  Rationale: A Stage 3 `facts` branch could never run and would require dead-path fixtures and tests. The rule seam is repository-private through Stage 5, so extending the union later has no compatibility cost. `flowchart/no-markdown-heading-in-label` requires `syntax-valid` so it never offers edits against canonically invalid source.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Keep Stage 3 prerequisite gating internal. `ValidationResult`, JSON-v2, and Markdown host mapping do not expose `ruleSkips`; tests prove that `syntax-valid` rules are not called when canonical syntax is unavailable. User-visible skip metadata is deferred until Stage 5 Semantic Facts makes completeness-related skips independently actionable.
  Rationale: The Stage 3 built-in requires valid syntax, and an existing Mermaid/system Finding already explains why it did not run. Exposing skip records now would add result types, ordering, JSON fields, host spans, and documentation without improving the first rule/fix contract.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Rules return diagram-relative project-owned reports; Diagram Validation assigns configured severity, the rule id as Finding code, `source: "rule"`, and projects spans/edits to host offsets.
  Rationale: A rule must not know whether its diagram came from a standalone file or Markdown. Central assignment prevents rule modules from overriding code/source/severity policy.
  Date/Author: 2026-07-22 / Codex.

- Decision: Add `fixes?: readonly TextEdit[]` to `Finding`; every TextEdit is a zero-based half-open UTF-16 host span and replacement text.
  Rationale: The same host-coordinate edits can drive CLI application and Stage 4 quick fixes. Rules initially create embedded edits, but only validated/projected host edits cross the Diagram Validation interface.
  Date/Author: 2026-07-22 / Codex.

- Decision: An embedded TextEdit is safe to project only when its replaced range lies wholly inside one copied offset-map segment; a cross-segment edit is omitted rather than widened across Markdown container prefixes.
  Rationale: Existing span projection is adequate for diagnostics but a replacement must not delete blockquote/list prefixes or normalized gaps. The first rule's single-line prefix deletion satisfies the stricter requirement.
  Date/Author: 2026-07-22 / Codex.

- Decision: A document fix plan is all-or-nothing for validation safety. Any original canonical/system error blocks output while preserving the original Finding/exit classification; invalid edit bounds, same-offset insertions, overlaps, any post-fix canonical/system error, or a second pass proposing any safe edit from the complete enabled rule selection also blocks output with the appropriate fix failure.
  Rationale: A custom-rule fixer must operate only on a canonically validated document and must refuse ambiguous ranges, conflicts, incomplete validation, syntax regressions, and transformations that make a second complete fix run change the file again. Merely asking `--fix` must not upgrade a normal Mermaid syntax error from exit `1` to a system failure. Applying edits in descending offset order is deterministic only after the complete set passes these checks.
  Date/Author: 2026-07-22 / Codex.

- Decision: Expose an in-memory `planDocumentFixes()` alongside `validateDocument()` through the repository module seam, while keeping filesystem writes in CLI.
  Rationale: Diagram Validation owns edit validation, conflicts, canonical revalidation, and idempotence; the CLI owns file reads/writes. Both operations remain private repository interfaces and use the same validation core.
  Date/Author: 2026-07-22 / Codex.

- Decision: Add mutually exclusive `--fix` and `--fix-dry-run`. Both compute and revalidate the same in-memory plan. Dry-run never writes; JSON includes the proposed `output`, while terminal mode reports `Would fix ...`. Apply mode writes only `changed` plans and reports post-fix results.
  Rationale: One planner prevents preview/application drift. Full proposed text is unambiguous in structured output; terminal users receive concise status without a new diff dependency.
  Date/Author: 2026-07-22 / Codex.

- Decision: Keep detailed `DocumentFixStatus` internal and project one user-visible `fix.status`: `unchanged`, `previewed`, `applied`, `blocked`, or `write-failed`. Failure Findings carry the specific blocker reason.
  Rationale: Exposing both plan and application status creates a cross-product that consumers and tests must reconcile. One final status states what happened to the file, while the internal plan and stable Finding codes preserve diagnostic detail.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Apply fixes independently per file. A conflict, invalid edit, original/post-fix safety failure, or non-idempotence blocks only that document; other `changed` plans remain writable. Each individual document is still all-or-nothing, and collection exit precedence remains `3 > 2 > 1 > 0`.
  Rationale: The Stage 3 safety contract is document-scoped. Collection-wide preflight added coordination states and prevented useful safe fixes without providing filesystem-level transactionality.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: Continue processing later safe documents after a filesystem write failure. Record bounded `input/write-failed` for the affected path, retain its original Validation Result, and aggregate exit `2` unless a system error raises it to `3`.
  Rationale: This keeps all Stage 3 application failures file-scoped, removes fail-fast coordination and the `not-attempted` state, and still reports exactly what reached disk.
  Date/Author: 2026-07-25 / User and Codex.

- Decision: In dry-run, the top-level document result and collection summary describe the unchanged file; `fix.proposedResult` describes `fix.output` and uses offsets into that proposed text.
  Rationale: A preview must not make existing Findings disappear or imply that disk changed. Nesting the revalidated proposal preserves both truths and avoids mixing coordinate spaces.
  Date/Author: 2026-07-22 / Codex and reviewer agent.

- Decision: Extend JSON-v2 in place with optional rule/fix fields and update its private pre-release reference rather than introducing JSON-v3.
  Rationale: The current JSON-v2 reference explicitly carries no backward-compatibility promise, and Stage 6—not Stage 3—stabilizes JSON. The schema version still denotes the repository collection envelope introduced in Stage 2.
  Date/Author: 2026-07-22 / Codex.

- Decision: Implement the first rule with a bounded state-machine scanner over accepted Flowchart text and do not reuse mermaid-lint's closed rule registry or upstream AST values.
  Rationale: The roadmap explicitly requires handling quotes, escapes, nested delimiters, Markdown Strings, and modern shapes. A project-owned scanner keeps the rule independent of renderer and noncanonical parsers and can refuse ambiguous ranges.
  Date/Author: 2026-07-22 / Codex.

- Decision: Recognize ATX heading markers only at a Markdown String line start after zero to three spaces: one to six unescaped `#` characters followed by horizontal whitespace and non-empty content. The safe fix deletes only the hashes and following horizontal whitespace.
  Rationale: This is a bounded CommonMark-like heading subset with negligible false positives. It preserves label content, does not invent replacement styling, is line-local, and is idempotent. Escaped hashes, `#nospace`, seven hashes, plain quoted labels, edge text, comments, and ambiguous label boundaries are not fixed.
  Date/Author: 2026-07-22 / Codex.

- Decision: Keep the first scanner scoped to node labels, including legacy bracket/parenthesis/brace forms and modern `@{ shape: ..., label: ... }` declarations; edge labels are deferred.
  Rationale: The Stage 3 exit criteria specifically stress node-shape delimiters and modern shape syntax. Expanding into every Flowchart string context would increase false-positive risk without evidence.
  Date/Author: 2026-07-22 / Codex.

- Decision: Process each rule as `off`, known-type non-applicable, prerequisite, then run; when canonical processing supplies no trusted type, prerequisite evaluation precedes applicability.
  Rationale: A Flowchart-only rule should be omitted immediately for a known non-Flowchart type, while an unavailable trusted type still requires the prerequisite gate before the engine can decide whether to invoke it. Both paths remain internal and produce no extra result record.
  Date/Author: 2026-07-22 / Codex and reviewer agent.

## Outcomes & Retrospective

Planning outcome: this document turns the Stage 3 roadmap paragraph into a staged, testable contract while preserving the completed Stage 2 baseline. It fixes the private registration boundary, exact config grammar, prerequisite gating, fix safety, and user-visible CLI behavior that would otherwise be left to implementation-time guesses.

Implementation outcome: pending. On completion, record the files and dependency versions actually added, final test counts on Node 22 and 24, observable CLI transcripts, any deviations from the scanner/config/fix contracts, and whether Stage 3 reached its `v0.2` internal release cut. Do not mark Stage 3 complete merely because the plan exists.

## Context and Orientation

The repository is one private TypeScript ESM package. `src/validation/` is the Diagram Validation deep module: it accepts an immutable Document Snapshot and returns a Validation Result. A Document Snapshot contains a URI, `mermaid` or `markdown` language id, text, and optional editor version. A Finding is a stable diagnostic whose optional half-open span uses zero-based UTF-16 offsets in the original host document. JavaScript string indices already count UTF-16 code units, so an emoji occupies two offsets. A Validation Result is valid exactly when it contains no error-severity Finding.

`src/validation/canonical-syntax/` is an internal serialized worker adapter around exact-pinned `mermaid@11.16.0` and `jsdom@26.1.0`. Official Mermaid remains the only canonical syntax authority. A rule can add a style or semantic Finding, but it cannot turn an official rejection into acceptance or replace the parser verdict. Raw Mermaid values never enter a rule.

`src/validation/markdown/` extracts exact-lowercase Mermaid fences and builds copied-segment maps from embedded UTF-16 offsets back to the Markdown host. Diagnostic spans may cross mapped segments using the established boundary biases, but Stage 3 TextEdits use a stricter rule: a replacement must fit within one copied segment so it cannot consume Markdown list/blockquote prefixes. Extraction and mapping failures remain atomic per Markdown document.

`src/cli/` is the only active delivery adapter. It loads the nearest upward `mermaid-validator.config.json` or an exact `--config` path, discovers and reads files, constructs Document Snapshots, invokes Diagram Validation, formats terminal/JSON-v2 output, and assigns exit codes. CLI may import only `src/validation/index.ts`, never `src/validation/rules/**`, Canonical Syntax internals, Markdown internals, Compatibility Evidence, Mermaid, or Zod.

Compatibility Evidence remains under `src/compatibility/`. It may observe `src/validation/index.ts`, but no product module may import compatibility contracts. Its exact-pinned `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` dependencies remain development-only evidence. The mermaid-lint closed rule registry and generic fixer are not this product's plugin or fix contract.

In this plan, a rule module is a repository-private object with a namespaced id, default severity/options, one prerequisite level, optional diagram-family applicability, and an asynchronous `run()` function. A rule report is diagram-relative evidence returned by that function. Diagram Validation converts it to a host-relative Finding and owns validation of all spans and edits. A registry is an immutable, deterministic collection of rule modules; registration validates ids/defaults and rejects duplicates.

A rule selection is the already validated set of per-rule severities and parsed options passed to one validation call. CLI obtains it by layering the config's base `rules` with every matching override in declaration order. Stage 3 prerequisite gating is internal: an unavailable prerequisite prevents a rule invocation without adding a Finding or a separate result record.

A TextEdit replaces `document.text.slice(startOffset, endOffset)` with `newText`. Two non-empty edits overlap when their half-open ranges intersect. Two insertions at the same offset also conflict. A document fix plan is the result of collecting candidate edits, validating/mapping/deduplicating them, rejecting conflicts, applying them from highest start offset to lowest, revalidating the changed snapshot, and proving a second planning pass would not propose another edit from an applied rule.

The planning baseline is commit `c721bd0` on `main`, one commit ahead of `origin/main`. The worktree already contains an unrelated modified `README.md` and unrelated untracked `docs/performance/`; preserve them. This ExecPlan is the only Stage 3 artifact created by planning. At planning time Node 22.20.0, pnpm 10.30.1, `pnpm check` (20 files/122 tests), and `pnpm compatibility` (4 files/16 tests, 27 fixtures/108 observations) pass.

Stage 3 may create only these product capabilities:

    src/validation/rules/
      index.ts
      contracts.ts
      options-schema.ts
      registry.ts
      run-rules.ts
      fixes.ts
      builtins/
        no-markdown-heading-in-label.ts

    src/validation/fix-document.ts

The exact private filenames may be refined if ownership stays identical and this plan is updated. Do not create `src/lsp/`, `src/mcp/`, a Semantic Facts adapter, package exports, declaration output, arbitrary plugin loaders, or any render/geometry/vision module.

## Plan of Work

### Milestone 1: Establish the Stage 3 dependency and architecture boundary

Begin by adding exact runtime `zod@4.4.3` with pnpm and no other dependency. Update `tests/architecture/engine-versions.test.ts` or a focused dependency-ownership test so the manifest must contain that exact pin and cannot contain a second rule/config/glob library. Extend `tests/architecture/module-import-boundaries.test.ts` rather than restoring a standalone checker or adding another dependency or script. The check must detect cycles among resolved project imports; restrict Compatibility Evidence to its own subtree plus `src/validation/index.ts`; allow root validation to enter Rules only through `src/validation/rules/index.ts`; keep files inside Rules within their subtree plus explicitly permitted project-owned root-independent types; keep CLI on `src/validation/index.ts`; reject Rules imports of CLI, Compatibility Evidence, Canonical Syntax/Markdown internals, filesystem/process APIs, `@mermaid-lint/core`, and Merman; and allow Zod only in `src/validation/rules/options-schema.ts` (plus tests).

After the dependency and boundary tests exist and before adding Stage 3 product code, update `ARCHITECTURE.md` to show the Stage 3 active tree and data flow, replacing the Stage 2-only active snapshot without changing the accepted direction. Record that Rule Engine is now a real internal capability of Diagram Validation, that fix planning stays in-memory, and that CLI alone owns config paths and filesystem writes. Rewrite the static-enforcement section from a future-checker proposal into the current focused Vitest/TypeScript AST checker plus this milestone's new enforced rules. Delete the obsolete transition that says current code still lives under `src/spike/` and `src/adapters/`. This is not a load-bearing architecture reversal and does not require a new ADR. If implementation evidence requires CLI to deep-import rules, rules to import CLI/compatibility, a second canonical engine, a package split, or an upstream type to cross the validation seam, stop and write an ADR before continuing.

Add initially failing architecture and contract tests before implementation. At the end of this milestone, the exact dependency is installed and architecture fixtures fail for a project import cycle, a Compatibility Evidence import of CLI or a validation deep path, a CLI deep rule import, a root-validation deep rule import, a rule import of CLI/Compatibility Evidence/Canonical Syntax/Markdown internals, a rule import of filesystem/process APIs or either comparison engine, or Zod imported outside its adapter. Existing Stage 2 gates remain green except for intentionally red Stage 3 behavioral tests.

### Milestone 2: Define registration, option, config, and override contracts

Create project-owned rule contracts and an immutable registry inside `src/validation/rules/`. Registration must accept an array of modules rather than switch on a closed union, retain declaration order, validate the namespaced id and reserved namespaces, reject duplicates, parse each default option through its schema, and expose lookups without exposing a mutable map. A repository fixture under `tests/fixtures/rules/` defines `example/max-source-length`, uses an asynchronous `run()`, consumes a positive-integer option, and registers beside the built-in list in internal tests. The test must not edit `BuiltInFindingCode`, a `RuleId` union, or product source to add its id.

Implement the Zod adapter in `src/validation/rules/options-schema.ts`. It converts success into a project-owned parsed value and failure into one bounded message with a stable config path. Do not return `ZodError`, `ZodIssue`, schemas, or inferred Zod types through `src/validation/rules/index.ts` or `src/validation/index.ts`. Use strict objects so unknown option keys fail. The built-in rule's schema accepts only `{}`; the fixture rule's schema proves typed options and invalid-option rejection.

Expand `src/cli/config.ts` from the Stage 2 `{ ignore? }` shape to strict `{ ignore?, rules?, overrides? }`. Reject all other top-level and override fields. A base or override rule map accepts only registered ids and either a severity string or `[severity, options]`. Resolve each supplied map to a sparse immutable `ResolvedRuleConfigurationPatch` containing only explicitly named ids. Validate every base/override patch while loading the config, before discovery or file reads; invalid ids, severities, tuple lengths, or options produce one bounded stderr error and exit `2` with no JSON collection.

Each override has a non-empty `files` array and a non-empty `rules` object. Reuse the Stage 2 limited pattern grammar: forward-slash relative patterns with literals, `/`, `*`, `?`, and `**`; reject negation, absolute paths, parent traversal, backslashes, braces, brackets, parentheses/extglobs, NUL, and empty patterns. In `src/cli/config.ts`, normalize an in-root discovered path to a forward-slash config-root-relative path, apply `path.matchesGlob()` against every pattern, merge the sparse base and matching override patches in array order, and only then materialize missing registered ids from built-in defaults. Outside-root explicit paths receive the materialized base patch only. Add unit tests for exact files, `**`, multiple matches/later-wins, no match, outside root, Windows separator normalization independent of host OS, invalid patterns, and two registered rules proving that an override changing rule B preserves base rule A.

At the end of this milestone, focused tests prove registry openness and determinism, bounded schema errors, and strict config and override behavior. No rule has yet run through `validateDocument()`.

### Milestone 3: Integrate asynchronous rules and prerequisite gating into Diagram Validation

Refactor root validation so each standalone source or extracted Markdown diagram obtains its canonical Syntax Outcome once, maps the canonical Finding as today, and passes the same outcome plus diagram text to the Rule Engine. Do not make a second official parse merely to run rules. Preserve current behavior that Markdown attempts every block after a block-local parser system outcome and that cancellation is the only expected rejection crossing the validation interface.

Resolve each rule in registry order: omit `off`; if the canonical outcome contains a trusted normalized type and the rule does not apply to it, omit it as non-applicable; evaluate the prerequisite; then await `run()`. If canonical processing provides no trusted type, evaluate the prerequisite before applicability, because a parser failure cannot prove the rule irrelevant. Stage 3 prerequisites are `text` and `syntax-valid`. A syntax error or parser/system failure prevents otherwise eligible `syntax-valid` rules from running; a successful official parse satisfies `syntax-valid`, including an officially accepted but project-unsupported type. These internal decisions add neither Findings nor skip metadata. Text rules may run after syntax or system failure because their declared input is raw source, but the canonical/system Finding remains authoritative. Add paired invalid Flowchart and invalid Sequence tests proving that the Flowchart-only built-in is not invoked for either invalid input.

Pass each rule an immutable context containing diagram source, host document URI, zero-based diagram index, normalized diagram type when known, parsed options, and the caller's AbortSignal. Check cancellation before and after each awaited rule. Rethrow `AbortError`. Convert every other rule rejection into one bounded `system/rule-runtime-failed` error naming only the rule id, continue later rules, and never expose a thrown message or stack.

Validate every Rule Report before converting it. Its message must be non-empty and bounded; its diagram-relative span and every TextEdit span must use safe integers, ordered half-open bounds, and lie within diagram text. Invalid reports create one `system/rule-protocol-error` error for that rule and discard all reports from that invocation. Apply configured severity and the module id centrally. Stable ordering is diagram source order, then registry order, then report order. Canonical Findings for a diagram precede its rule/system Findings.

For Markdown, map every Rule Finding span through the established diagnostic projector and copy only host-bounded results. Map fixes through a new strict edit projector in the Markdown capability that succeeds only within one copied segment. If the Finding span cannot map, retain the established atomic `system/markdown-extraction-failed` behavior. If only a candidate edit cannot map contiguously, omit that edit and retain the Finding; do not fail validation or widen the edit. Standalone spans/edits copy directly after bounds checks.

Preserve the `ValidationResult` document URI/version/count/valid contract and add only optional Finding `fixes`. Update `src/cli/json-v2-output.ts` and its tests so those fixes serialize deterministically without changing summary Finding/severity counts. Terminal output keeps compiler-style diagnostic lines, appending a concise ` [fixable]` marker when a Finding has at least one safe fix.

At the end of this milestone, contract tests cover standalone/Markdown equivalence, warning/error validity, internal prerequisite gating for syntax rejection and parser/system failure, rule failure isolation, malformed reports, cancellation, host projection, and deterministic ordering. Tests assert gated fixture rules are not invoked. Existing canonical results remain unchanged when every rule is off.

### Milestone 4: Implement the first Flowchart rule and safe edit policy

Implement `flowchart/no-markdown-heading-in-label` in `src/validation/rules/builtins/no-markdown-heading-in-label.ts`. It has default severity `warning`, strict empty options, prerequisite `syntax-valid`, and Flowchart applicability. It uses a bounded lexical scanner, not one large regular expression and not an upstream AST. The scanner tracks Mermaid comments, quoted strings, escapes, legacy node-shape opening/closing delimiters (including nested/doubled delimiter forms), modern attribute-object nesting, `label:` values, Markdown String backtick boundaries, and line boundaries inside Markdown Strings. It must make forward progress for every UTF-16 code unit and remain linear in source length.

Before finalizing scanner fixtures, run every positive and negative diagram through the existing canonical worker. Test only examples accepted by pinned official Mermaid unless the test is specifically proving prerequisite skipping. Positive fixtures include legacy square/round/brace/doubled shapes, multiline Markdown Strings, escaped quotes, nested delimiters in label text, CRLF, Unicode before the marker, and modern `@{ shape: ..., label: "\`# Heading\`" }` declarations. Negative fixtures include ordinary quoted labels, edge labels, comments, directives, escaped `\#`, `#nospace`, seven hashes, more than three leading spaces, heading-looking text outside a node label, and ambiguous or unterminated label delimiters.

Within a recognized Markdown String node label, report each line whose content begins with zero to three spaces, one to six unescaped `#` characters, horizontal whitespace, and at least one later non-whitespace character. The Finding span covers the marker and following horizontal whitespace. The message is stable and explains that Markdown headings produce inappropriate block-level label structure. The help text says to use plain text or inline emphasis.

Offer one TextEdit whose span is exactly the Finding span and whose replacement is empty. Do not offer an edit for an ambiguous delimiter, a cross-line/cross-segment marker, or any report whose exact host range cannot be proven. Multiple definite headings create multiple non-overlapping Findings/edits. Applying all edits preserves every other code unit, including line endings and Markdown container prefixes.

Implement pure edit normalization and conflict detection in `src/validation/rules/fixes.ts`. Validate again at the host boundary, deterministically deduplicate byte-for-byte identical edits from the same rule/Finding, and treat partially/fully overlapping replacements or multiple insertions at one offset as conflicts. Apply an accepted edit list in descending `startOffset`, then descending `endOffset`, without normalizing host text.

At the end of this milestone, internal scanner tests cover every exit-criterion syntax family, property-style tests or a deterministic corpus prove termination and bounds on malformed delimiter strings, and contract tests prove exact standalone and Markdown host edits. Applying the built-in rule once removes every definite marker; applying it again yields no edit and identical text.

### Milestone 5: Add in-memory fix planning and CLI fix modes

Create `src/validation/fix-document.ts` and export `planDocumentFixes()` plus project-owned result types through `src/validation/index.ts`. The planner first calls `validateDocument()` with the resolved complete rule selection. If that original result contains any error-severity Mermaid or system Finding, it returns `unsafe` with only `originalResult` and provides no output even if a text rule supplied a candidate edit. It does not add `system/fix-validation-failed`: an original Mermaid syntax error remains exit `1`, while an original system error already yields exit `3`. If there are no safe edits it returns `unchanged`. If edit normalization detects conflicts it returns `conflict`; invalid candidate protocol returns `invalid`. Those protocol/conflict cases attach a `failureResult` equal to the original result plus the matching bounded system Finding, no output, and no applicable edits.

For an accepted edit set, apply once in memory and call `validateDocument()` on a snapshot with identical URI/language/version and the proposed text. Reject the plan as `unsafe` with a `failureResult` containing `system/fix-validation-failed` if post-fix validation contains any error-severity Mermaid or system Finding, regardless of whether a similar failure existed before. Then plan once more from the proposed text with the same complete rule selection but without applying. If any enabled, applicable rule proposes any safe edit, reject as `non-idempotent` with a `failureResult` containing `system/fix-non-idempotent`; do not restrict the check to rules that contributed the first edit. Otherwise return `changed`, the sorted host edits, proposed output, `originalResult`, and `proposedResult`. Add fixture rules where A's edit exposes B's edit; the first plan must be non-idempotent. The planner never reads or writes a file.

Extend Commander with mutually exclusive `--fix` and `--fix-dry-run`. Both are valid with terminal or JSON output and retain `--config`, discovery, and collection behavior. Ordinary validation still calls `validateDocument()`. A fix mode calls `planDocumentFixes()` for every successfully read snapshot before any write.

Dry-run performs no filesystem mutation. Terminal mode reports original-file diagnostics and one deterministic status line per changed file, `<path>: would apply <n> safe edit(s)`; unchanged files add no status. JSON-v2 keeps the top-level document result and collection summary tied to original file contents. Its optional document `fix` object contains one final `status`, edit count, sorted host edits, `output`, and `proposedResult` for a changed preview. `proposedResult` is the revalidation of `output`, and every span inside it is relative to `output`, not the original file. A changed dry-run uses `status: "previewed"`; unchanged uses `unchanged`; a non-writable plan uses `blocked` and reports the appropriate original or fix-failure result. Tests compare file contents before and after the complete command and cover an early edit that shifts a later proposed Finding so the two coordinate spaces cannot be conflated.

Apply mode writes only `changed` outputs. Add a CLI-owned `writeFile` dependency for tests and use UTF-8 without normalizing line endings. Precompute every plan before the first write, then process documents in deterministic path order. A `conflict`, `invalid`, `unsafe`, or `non-idempotent` plan blocks only its own document, reports `failureResult ?? originalResult` with `status: "blocked"`, and does not prevent another `changed` plan from being written. Unchanged documents report their original result with `status: "unchanged"`. A successful write uses `proposedResult` and `status: "applied"`. A write failure becomes bounded `input/write-failed`; that document retains its original result with `status: "write-failed"`, while earlier successful writes retain proposed results and later safe documents are still attempted. JSON sets `complete: false`, and exit precedence remains system `3`, then input `2`, then validation error `1`, then success `0`. Document that process/filesystem failures can leave a subset changed and that version control or a rerun is the recovery path; cross-file atomicity belongs to production hardening, not Stage 3.

After successful writes, report each applied document's post-fix result. Terminal mode emits `<path>: applied <n> safe edit(s)` only after a successful write; it never emits that line for blocked or failed documents. JSON includes the final status and edit count but omits full `output` in apply mode because the file is the source of truth. A default-warning document fixed cleanly exits `0`. An error-severity rule fixed cleanly also exits `0` because the reported state is post-fix. A conflict/system fix failure exits `3` even when another safe document was applied; a write failure exits `2` unless a system error exists.

At the end of this milestone, built-process integration tests prove no-write dry-run, successful standalone and Markdown writes, multiple files, unchanged files, CRLF/Unicode preservation, document-local conflict refusal, original/post-fix canonical or system failure refusal, cross-rule non-idempotence refusal, file-level plan/write isolation, bounded write failures, and exact actual-file/result/final-status alignment. Include `--fix` on an existing syntax-invalid document with no write and exit `1`; a dry-run where an early edit shifts a later proposed Finding; a collection where one safe plan is applied while one conflicting document remains unchanged; and a three-write collection where the second write fails but the first and third are applied.

### Milestone 6: Document and close Stage 3 without entering Stage 4

Update `docs/reference/json-output-v2.md` with optional Finding `fixes` and fix-mode projections. Add `docs/reference/rules-and-fixes.md` describing built-in defaults, exact config examples, override order/root behavior, safe-fix guarantees, dry-run/application behavior, and private registration status. Update the user-owned `README.md` carefully: preserve all unrelated edits and add only the validated Stage 3 usage needed by the current document. If that overlap cannot be isolated, leave README unchanged and record the deferred doc edit here rather than overwriting user work.

Finalize `ARCHITECTURE.md` with any implementation-proven filename refinements and final enforcement evidence, then update `DRAFT-PLAN.md` only after all gates pass: mark Stage 3 complete with actual dates/counts, retain Stages 4–6 as not started, and do not alter the deferred visual roadmap. Change package version from `0.1.0` to internal `0.2.0` only at closeout, update CLI/version tests, and keep `private: true` with no `exports`, declarations, publication, tag, or commit unless separately requested.

Run focused and full gates under Node 22.20.0 and Node 24.18.0. Compatibility Evidence must remain 27 fixtures/108 observations unless an intentionally reviewed canonical product observation requires a snapshot update; rule fixtures do not belong in the Stage 0 compatibility corpus. Record final test counts, dependency list, representative validation/config/fix transcripts, and any decisions in this living plan. Complete `Outcomes & Retrospective` and append a dated revision note. Stop before creating LSP or Semantic Facts code.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix for shell commands. Use pnpm for Node package work, patch-based edits for files, and preserve unrelated user changes. Do not commit unless the user separately requests it.

Establish and record the actual starting state rather than assuming this planning snapshot is still current:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch
    rtk git log -1 --oneline
    rtk node --version
    rtk pnpm --version
    rtk pnpm install --frozen-lockfile
    rtk pnpm check
    rtk pnpm compatibility

The planning snapshot is `c721bd0`, `main...origin/main [ahead 1]`, unrelated `README.md` and `docs/performance/` worktree changes, Node 22.20.0, and pnpm 10.30.1. A future executor must update this section if the checkout moves. Do not clean, reset, stage, or commit the unrelated paths.

Add the sole Stage 3 dependency exactly:

    rtk pnpm add --save-exact zod@4.4.3
    rtk pnpm install --frozen-lockfile
    rtk pnpm list --depth 0

The list must show `zod 4.4.3` as a direct runtime dependency. Do not add lilconfig, Ajv, Minimatch, Picomatch, a second rule framework, an AST parser, an LSP package, a visual dependency, or move `@mermaid-lint/core`/Merman to runtime.

Create the focused red suites under the planned internal/contract/unit/integration locations, then run them after each milestone:

    rtk pnpm exec vitest run tests/internal/validation/rules
    rtk pnpm exec vitest run tests/contract/validation
    rtk pnpm exec vitest run tests/unit/cli/config.test.ts
    rtk pnpm exec vitest run tests/unit/cli/reporters.test.ts tests/unit/cli/main.test.ts
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/architecture

After registry/config implementation, run:

    rtk pnpm typecheck
    rtk pnpm exec vitest run tests/internal/validation/rules/registry.test.ts
    rtk pnpm exec vitest run tests/unit/cli/config.test.ts
    rtk pnpm exec vitest run tests/architecture

After rule orchestration and the built-in scanner, run:

    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/validation/rules
    rtk pnpm exec vitest run tests/internal/validation
    rtk pnpm exec vitest run tests/contract/validation

After fix planning and CLI wiring, run:

    rtk pnpm build
    rtk pnpm exec vitest run tests/unit/cli
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/architecture

Create checked-in Stage 3 fixtures with final names recorded here. Planned observable commands are:

    rtk node dist/cli/main.js tests/fixtures/rules/heading-warning.mmd
    rtk node dist/cli/main.js --config tests/fixtures/rules/error-config/mermaid-validator.config.json tests/fixtures/rules/error-config
    rtk mktemp -d /tmp/mermaid-validator-stage3.XXXXXX
    # Treat the returned absolute directory as <stage3-temp-dir> below.
    rtk cp tests/fixtures/rules/fixable.mmd <stage3-temp-dir>/fixable-copy.mmd
    rtk node dist/cli/main.js --fix-dry-run --format json <stage3-temp-dir>/fixable-copy.mmd
    rtk node dist/cli/main.js --fix <stage3-temp-dir>/fixable-copy.mmd
    rtk node dist/cli/main.js --fix <stage3-temp-dir>/fixable-copy.mmd
    rtk rm -r <stage3-temp-dir>

The default validation reports one warning with `source: "rule"`, code `flowchart/no-markdown-heading-in-label`, a host span, and a safe TextEdit; it exits `0`. The error config reports the same code/severity `error` and exits `1`. Dry-run contains the proposed output but leaves the temporary file byte-for-byte unchanged. The first apply changes only the marker, reports `applied`, and exits `0`; the second reports no change, proving whole-selection idempotence. Only the uniquely created temporary directory is removed; no tracked fixture is mutated.

Exercise failure and compatibility behavior through tests plus safe copied fixtures, not by corrupting tracked originals:

    rtk node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/flowchart/invalid-edge.mmd
    rtk node dist/cli/main.js --config tests/fixtures/rules/invalid-config/mermaid-validator.config.json
    rtk node dist/cli/main.js --version

The valid canonical fixture remains silent except for any intentionally applicable default rule and exits `0`; the existing minimal fixture should have no rule Finding. The invalid fixture retains only its Mermaid syntax Finding, does not invoke the enabled syntax-valid rule, and offers no fix. Invalid config writes one bounded stderr line, no JSON, and exits `2`. After closeout, `--version` prints `0.2.0` without starting the parser or discovering files.

Run the final gate with explicit absolute NVM paths so the commands do not depend on shell-selected Node and do not repurpose broad environment variables:

    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" node --version
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm install --frozen-lockfile
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm check
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v22.20.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility

    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" node --version
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm install --frozen-lockfile
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm check
    rtk env PATH="/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm compatibility

Finish with evidence and hygiene inspection:

    rtk pnpm list --depth 0
    rtk git diff --check
    rtk git status --short --branch
    rtk git diff -- package.json pnpm-lock.yaml ARCHITECTURE.md DRAFT-PLAN.md docs/reference src tests

Inspect `README.md` separately because it was already modified before Stage 3. Do not include unrelated `docs/performance/` or other user work in implementation, staging, or any later commit.

## Validation and Acceptance

Stage 3 is accepted only when user-visible rule/fix behavior, private extensibility, architecture boundaries, and regressions all pass.

For registration, an external-style fixture module with a new namespaced id, asynchronous runner, prerequisite, default severity, and typed option schema registers beside built-ins without editing product unions or switches. Invalid/reserved ids, duplicate ids, invalid default options, and duplicate registry entries fail deterministically before document validation. Registration order determines Finding order. No user configuration can load a filesystem/URL/module plugin in Stage 3.

For configuration, running with no config file enables the built-in warning by default. `rules` can set it to off/warning/error or supply the exact `[severity, {}]` tuple. Unknown fields, rule ids, severities, tuple lengths, or option keys fail before discovery with exit `2`. Base and override maps remain sparse until matching is complete; built-in defaults materialize exactly once afterward. Override patterns are config-root-relative and bounded; matching overrides layer in declaration order with later explicitly named settings winning without resetting unrelated base rules. An explicit file outside the config root receives the materialized base rules but no override. Rule errors contribute exit `1`; warning/info-only rule Findings do not change exit `0`.

For prerequisites, Stage 3 supports only `text` and `syntax-valid`. Text rules can run even when canonical syntax fails. Syntax-valid rules run only after official parse success; syntax rejection and parser/system failure prevent invocation without adding Findings or skip metadata. Off and known-type non-applicable rules also produce no Finding. Fixture spies prove gated rules are not called. Official Mermaid remains the only syntax verdict, is invoked once per diagram, and rule output cannot alter that verdict.

For rule isolation, asynchronous execution honors AbortSignal. Abort propagates as `AbortError`; every other thrown value becomes bounded `system/rule-runtime-failed`, later rules still run, and raw messages/stacks do not escape. Invalid spans/edits/messages become bounded `system/rule-protocol-error`. Result ordering is stable. `valid` remains exactly “no error-severity Finding.”

For the first rule, only officially valid Flowchart node Markdown Strings are inspected. The scanner handles the legacy shape delimiters and modern attribute shape syntax exercised by fixtures, plus quotes, escapes, nested delimiters, multiline text, CRLF, and Unicode. It flags only the defined one-to-six-hash line-start form. Plain labels, edge labels, escaped hashes, no-space hashes, seven hashes, comments/directives, unsupported families, and ambiguous delimiter cases do not receive a false fix. Every Finding is `source: "rule"`, uses the configured severity, has a host-bounded span, and offers at most the exact safe marker deletion.

For Markdown, rule Findings refer to the original host URI and UTF-16 offsets. Diagnostic spans use the existing segment projection. Fixes are emitted only for a contiguous copied segment and never consume blockquote/list indentation, fences, frontmatter, prose, or an adjacent block. Multiple diagrams retain source order. Mapping failure behavior from Stage 2 remains atomic and bounded.

For fix safety, every edit is safe-integer, ordered, bounded, deterministic, and represented in host offsets. Identical edits deduplicate; overlap and same-offset insertions conflict. A conflict leaves that document unchanged without blocking another safe document. A document with any original error-severity Mermaid/system Finding is not writable, even if a text rule proposes an edit, but retains its original result: `--fix` on an existing syntax error writes nothing to that document and exits `1` unless a higher-precedence collection result exists. Accepted edits apply descending by offset without normalizing LF/CRLF or Unicode. Any post-fix error-severity Mermaid/system Finding prevents that document's write and becomes `system/fix-validation-failed`. A second plan with the same complete selection must find no safe edit from any enabled/applicable rule, including a rule newly triggered by the first edit. One successful pass removes every definite heading marker and the next pass is unchanged.

For CLI behavior, `--fix-dry-run` never mutates any file and structured output contains the exact proposed text plus its nested `proposedResult`. Dry-run top-level Findings, validity, summary, and exit code continue to describe the original file; nested proposed spans describe `fix.output`. `--fix` and dry-run are mutually exclusive usage options. Apply mode preplans the complete collection before writing but exposes only one final `fix.status`; detailed planner status stays internal and stable Finding codes explain blockers. A plan blocker or write failure affects only its own document; other safe documents remain eligible. Each applied document reports the post-fix result, while blocked and write-failed documents report results matching their unchanged contents; JSON can never imply that proposed text reached disk. JSON-v2 remains one object and includes optional fixes and fix status without changing existing counts. Terminal lines retain original-file compiler coordinates in dry-run, mark fixable Findings, and announce application only after a successful write. Exit precedence remains `3 > 2 > 1 > 0`.

For architecture, the resolved project graph is acyclic; Compatibility Evidence imports only its own subtree and `src/validation/index.ts`; CLI imports only `src/validation/index.ts`; root validation enters rules, Markdown, and Canonical Syntax through their `index.ts` seams; Rules never import CLI, compatibility, Markdown internals, Canonical Syntax internals, filesystem/process APIs, `@mermaid-lint/core`, Merman, or upstream AST types; only the rule option adapter imports Zod; only CLI owns config-root matching and file writes. The package remains one private package with no declarations/exports. LSP, MCP, Semantic Facts, rendering, geometry, image, layout, and model dependencies/directories remain absent.

For regression safety, `pnpm check` and `pnpm compatibility` pass under Node 22.20.0 and Node 24.18.0. Compatibility Evidence remains 27 fixtures/108 observations. Existing standalone/Markdown canonical verdicts, host mappings, discovery rules, JSON collection semantics, and exit precedence remain green. The final plan records actual counts and short transcripts.

## Idempotence and Recovery

Dependency installation is repeatable: add Zod once with the exact command, then use frozen installs. Generated `dist/` output may be rebuilt and must never be edited by hand or emitted beside TypeScript sources. Config, registry, scanner, and fix tests use checked-in deterministic fixtures or temporary directories cleaned in `finally`.

`validateDocument()` and `planDocumentFixes()` operate on immutable snapshots. Repeating validation has no side effect. Repeating an accepted fix plan against its proposed output with the same complete rule selection must return `unchanged` and contain no safe edit from any rule; otherwise the planner refuses the first output as non-idempotent. Fix application never normalizes a whole document and can be retried after correcting configuration or plugin code.

Dry-run is the safe inspection path and must compare bytes before/after in tests. Manual application examples operate only on a unique temporary copy. Apply mode plans the whole collection for deterministic reporting, but plan blockers and filesystem write failures are document-local and can leave an arbitrary successfully written subset changed. The CLI reports every completed path plus one bounded error per failed write, retains original results for failed files, continues with later safe documents, and returns exit `2` unless a system error takes precedence. Recovery is to inspect `git diff`, repair permissions/storage, and rerun; because accepted transforms are idempotent, already fixed files remain unchanged. Do not implement hidden backups or cross-file transactions in Stage 3.

If a rule report or Markdown edit cannot be proven in bounds, preserve the Finding when its diagnostic span is valid but omit the unsafe edit. If the report itself is malformed, emit the bounded protocol error and continue later rules. Do not clamp offsets, widen an embedded replacement, or expose raw rule-module/upstream errors.

If the Flowchart scanner encounters a syntax form it cannot delimit confidently, add that source as a focused test and return no fix for the ambiguous region. Do not replace the scanner with a broad regular expression or import an unofficial parser to force coverage. If official Mermaid rejects a proposed positive fixture, either correct the fixture or record why the syntax is out of scope.

If Zod, Node `matchesGlob`, Mermaid, or source-map behavior differs across Node 22 and 24, minimize the case behind its owning adapter/test before changing the design. Change a pin or load-bearing dependency direction only with evidence, a refreshed frozen lockfile, and a recorded decision; use an ADR when required by `ARCHITECTURE.md`.

Preserve all unrelated worktree changes. Never reset, delete, stage, or commit `README.md`, `docs/performance/`, or another user's edits as a cleanup shortcut. If README overlap is unsafe, omit that documentation edit and record it in this living plan. Do not commit unless explicitly asked.

## Artifacts and Notes

Planning-time repository evidence:

    $ rtk git rev-parse --short HEAD
    c721bd0

    $ rtk git status --short --branch
    ## main...origin/main [ahead 1]
     M README.md
    ?? docs/performance/

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
    Test Files  20 passed (20)
    Tests       122 passed (122)

Planning-time focused compatibility gate:

    Test Files  4 passed (4)
    Tests       16 passed (16)

The accepted config shape is equivalent to:

    {
      "ignore": ["vendor/**"],
      "rules": {
        "flowchart/no-markdown-heading-in-label": "warning"
      },
      "overrides": [
        {
          "files": ["docs/strict/**"],
          "rules": {
            "flowchart/no-markdown-heading-in-label": ["error", {}]
          }
        }
      ]
    }

Representative source behavior:

    flowchart LR
      A["`# Build`"]

produces a warning whose edit deletes `# ` and therefore proposes:

    flowchart LR
      A["`Build`"]

The planning-time accepted external facts are Zod `4.4.3` as the current stable npm release and official Mermaid's double-quote-plus-backtick Markdown String syntax. They justify the exact dependency pin and scanner fixtures but are restated here so implementation does not depend on live documentation.

Final implementation evidence must replace these placeholders with actual output:

    $ rtk node dist/cli/main.js tests/fixtures/rules/heading-warning.mmd
    .../heading-warning.mmd:2:7: warning flowchart/no-markdown-heading-in-label: Markdown headings are not allowed in Flowchart node labels [fixable]
    # exit 0

    $ rtk node dist/cli/main.js --fix-dry-run --format json <stage3-temp-dir>/fixable-copy.mmd
    # exit 0; document.fix.status "previewed"; output present; file unchanged

    $ rtk node dist/cli/main.js --fix <stage3-temp-dir>/fixable-copy.mmd
    .../fixable-copy.mmd: applied 1 safe edit(s)
    # exit 0; post-fix result valid; second run unchanged

Record the final exact dependency list, Node 22/24 test counts, compatibility summary, and any revised fixture/option names here at closeout.

## Interfaces and Dependencies

At the end of Stage 3, `src/validation/document.ts` keeps the immutable snapshot and extends options with one already resolved private rule selection:

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

`ResolvedRuleConfiguration` is a complete project-owned immutable selection created only after a sparse `ResolvedRuleConfigurationPatch` is layered onto built-in defaults. It may cross `src/validation/index.ts` because CLI must pass it inward, but neither type may expose mutable maps, Zod schemas/errors, Rule Module implementations, or upstream values. Absence from `ValidateOptions` means the complete built-in defaults.

`src/validation/findings.ts` adds the fix contract equivalent to:

    export interface TextEdit {
      readonly span: TextSpan;
      readonly newText: string;
    }

    export interface Finding {
      readonly code: string;
      readonly severity: "error" | "warning" | "info";
      readonly message: string;
      readonly source: "mermaid" | "rule" | "system";
      readonly span?: TextSpan;
      readonly locationPrecision: LocationPrecision;
      readonly diagramType?: string;
      readonly engine?: { readonly name: "mermaid"; readonly version: string };
      readonly help?: string;
      readonly fixes?: readonly TextEdit[];
    }

    export interface ValidationResult {
      readonly documentUri: string;
      readonly documentVersion?: number;
      readonly diagramCount: number;
      readonly valid: boolean;
      readonly findings: readonly Finding[];
    }

Extend `BuiltInFindingCode` with the Stage 3 system codes `system/rule-runtime-failed`, `system/rule-protocol-error`, `system/fix-conflict`, `system/fix-protocol-error`, `system/fix-validation-failed`, and `system/fix-non-idempotent`. They are error-severity, `source: "system"`, bounded-message Findings; rule runtime/protocol errors use the responsible diagram body where one is trustworthy, while host-level fix failures may use document precision without inventing a token range.

The private candidate seam in `src/validation/rules/contracts.ts` is equivalent to:

    export type RuleSeveritySetting = "off" | "warning" | "error";
    export type RulePrerequisite = "text" | "syntax-valid";

    export interface RuleOptionsSchema<Options> {
      readonly parse: (input: unknown) =>
        | { readonly ok: true; readonly value: Options }
        | { readonly ok: false; readonly message: string };
    }

    export interface RuleContext<Options> {
      readonly source: string;
      readonly documentUri: string;
      readonly diagramIndex: number;
      readonly diagramType?: string;
      readonly options: Options;
      readonly signal?: AbortSignal;
    }

    export interface RuleReport {
      readonly message: string;
      readonly span?: TextSpan;
      readonly help?: string;
      readonly fixes?: readonly TextEdit[];
    }

    export interface RuleModule<Options = unknown> {
      readonly id: string;
      readonly defaultSeverity: RuleSeveritySetting;
      readonly prerequisite: RulePrerequisite;
      readonly diagramTypes?: readonly string[];
      readonly optionsSchema: RuleOptionsSchema<Options>;
      readonly defaultOptions: unknown;
      readonly run: (context: RuleContext<Options>) => Promise<readonly RuleReport[]>;
    }

These `TextSpan`/`TextEdit` shapes inside the rule subtree are project-owned diagram-relative values; the internal seam may use private aliases to avoid an upward import cycle, then root validation copies validated values into public host-relative contracts. The final code must preserve the semantics even if names change.

`src/validation/rules/index.ts` exposes internally only operations equivalent to registry creation, built-in configuration resolution, running rules for one diagram, and strict edit normalization/application. It must not export Zod, built-in scanner internals, mutable registry storage, Mermaid outcomes, or filesystem behavior. Root validation is its only product caller.

Extend the existing internal `ValidationDependencies` used by `validateDocumentWithDependencies()` with an immutable Rule Registry defaulting to the built-ins. Internal and contract-oriented fixture tests inject a registry containing `example/max-source-length`, failing, malformed-report, and cross-rule-idempotence modules through that dependency. `validateDocument()` and `src/validation/index.ts` never accept arbitrary Rule Modules; this injection is the repository-local proof of the candidate registration seam, not a package or config plugin loader.

`src/validation/index.ts` additionally exposes private repository operations/types needed by CLI. Configuration parsing deliberately distinguishes a sparse patch from a complete materialized selection:

    export function resolveRuleConfigurationPatch(
      input: unknown,
    ): RuleConfigurationPatchResolution;

    export function mergeRuleConfigurationPatches(
      base: ResolvedRuleConfigurationPatch,
      patch: ResolvedRuleConfigurationPatch,
    ): ResolvedRuleConfigurationPatch;

    export function materializeRuleConfiguration(
      patch: ResolvedRuleConfigurationPatch,
    ): ResolvedRuleConfiguration;

    export async function planDocumentFixes(
      document: DocumentSnapshot,
      options?: ValidateOptions,
    ): Promise<DocumentFixPlan>;

The resolver returns a bounded discriminated result rather than throwing raw schema errors. A patch contains only ids supplied by that one config object. Merge is immutable and replaces only explicitly present ids. Materialization fills every still-missing registered id from its default exactly once, after base and matching overrides have merged. If a narrower set of functions can satisfy CLI without leaking rule internals, prefer it and update this plan while preserving these semantics.

The fix plan is equivalent to:

    export type DocumentFixStatus =
      | "unchanged"
      | "changed"
      | "conflict"
      | "invalid"
      | "unsafe"
      | "non-idempotent";

    export interface DocumentFixPlan {
      readonly status: DocumentFixStatus;
      readonly edits: readonly TextEdit[];
      readonly originalResult: ValidationResult;
      readonly output?: string;
      readonly proposedResult?: ValidationResult;
      readonly failureResult?: ValidationResult;
    }

Only `changed` has writable `output` and `proposedResult`; dry-run projects both, while apply mode may write `output`. `proposedResult` spans use offsets into `output`. `changed` never means the write occurred. An original canonical/system error returns `unsafe` with no `failureResult`, preserving `originalResult`. Conflict, invalid-edit, post-fix safety, and idempotence failures carry bounded system Findings in `failureResult`, not raw rule-module exceptions.

`src/cli/config.ts` owns data and path resolution equivalent to:

    interface CliConfig {
      readonly ignore?: readonly string[];
      readonly rules: ResolvedRuleConfigurationPatch;
      readonly overrides: readonly {
        readonly files: readonly string[];
        readonly rules: ResolvedRuleConfigurationPatch;
      }[];
    }

    interface LoadedCliConfig {
      readonly rootDirectory: string;
      readonly filepath?: string;
      readonly config: CliConfig;
    }

    function rulesForPath(
      loaded: LoadedCliConfig,
      absolutePath: string,
    ): ResolvedRuleConfiguration;

The final helper may remain private to CLI. It merges the sparse base and matching override patches, then materializes the complete result. No-config loading materializes an empty patch into built-in defaults. Config validation completes before discovery. Files outside `rootDirectory` receive only the materialized base patch.

`src/cli/contracts.ts` extends input errors and validated records so fix mode can project status without rereading:

    interface CliInputError {
      readonly code: "input/read-failed" | "input/write-failed";
      readonly path: string;
      readonly message: "Unable to read input file" | "Unable to write input file";
    }

The code/message pairing must be enforced by a discriminated union in final code. A validated document holds its snapshot, the Validation Result corresponding to actual file contents, and an optional Document Fix Plan. In fix modes it also carries one CLI-owned final status equivalent to:

    type FixStatus =
      | "unchanged"
      | "previewed"
      | "applied"
      | "blocked"
      | "write-failed";

`previewed` exists only in dry-run. `applied` exists only after a successful write. `unchanged` means the complete selection proposed no edit. A non-writable plan uses `blocked` only for its own document. A write failure uses `write-failed` on that file; later safe documents are still attempted. The CLI derives this value from mode, internal plan status, and actual write outcome rather than serializing the internal planner union.

JSON-v2 retains `schemaVersion: 2`, collection/document validity, input errors, document order, and summary counts. It adds optional Finding `fixes` and, only in a fix mode, a `fix` object containing final `status`, edit count, edits, and dry-run `output` plus `proposedResult` for changed previews. Optional fields are omitted, not null. Top-level Finding counts always use the result matching actual contents: original for `unchanged`, `previewed`, and `write-failed`; post-fix for `applied`; and the appropriate original or bounded fix-failure result for `blocked`. Nested `proposedResult` counts do not contribute to collection summary. `input/write-failed` is a collection error and not a Finding.

Dependency ownership at closeout is exact:

- `zod@4.4.3` is a runtime dependency imported only by `src/validation/rules/options-schema.ts` and tests.
- `mermaid@11.16.0` and `jsdom@26.1.0` remain owned by Canonical Syntax and compatibility observers.
- `mdast-util-from-markdown@2.0.3` remains imported only by `src/validation/markdown/extract-markdown.ts`.
- `globby@16.2.2` remains imported only by `src/cli/discovery.ts`; per-file override matching uses `node:path.matchesGlob` in CLI.
- `commander@15.0.0` remains inside `src/cli/**`.
- `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` remain development-only Compatibility Evidence and are not used by Stage 3 product rules/fixes.

No public package interface is created. Keep `private: true`; do not add `exports`, declaration emission, plugin module loading, installed-consumer tests, publication metadata, a monorepo, or later-stage dependencies.

## Revision Note

2026-07-22: Created the Stage 3 ExecPlan from the completed and hardened Stage 2 tree. The plan defines a repository-private asynchronous rule registry, Zod-isolated option validation, strict base/override config, diagram-wide suppression, observable prerequisite skips, a bounded Flowchart Markdown String scanner, host-safe TextEdits, conflict/canonical/idempotence checks, and CLI dry-run/application behavior. It exact-pins only Zod, preserves official Mermaid as syntax authority, keeps configuration/filesystem work in CLI, and leaves LSP, Semantic Facts, public plugins, and visual work deferred.

2026-07-22: Revised the draft after an independent reviewer-agent design-intent pass. The revision separates sparse rule patches from complete selections, rejects fixes around every original or post-fix canonical/system error, proves idempotence across the complete rule selection, orders known non-applicability before prerequisite skips, separates core plan status from actual CLI application status during multi-file failures, and moves manual apply checks to a temporary copy.

2026-07-22: Applied the reviewer's focused follow-up. An original syntax/system failure now blocks writing without manufacturing a new fix-system Finding, so its existing exit classification is preserved. Dry-run top-level results now remain tied to the unchanged file, while the revalidated proposal and its coordinate space live explicitly under `fix.proposedResult` beside `fix.output`.

2026-07-25: During pre-Stage-3 design grilling, narrowed architecture enforcement to one velocity-oriented extension of the existing Vitest/TypeScript AST check. Milestone 1 now explicitly covers current project cycles, Compatibility Evidence, Rules, comparison-engine and filesystem/process ownership, and Zod isolation without restoring a standalone checker or adding another command or dependency.

2026-07-25: Classified malformed or unknown inline suppressions as document-authored rule errors rather than infrastructure failures. They now use `mermaid-validator/invalid-suppression`, `source: "rule"`, error severity, and exit `1`; invalid config-file rule settings remain CLI input errors with exit `2`.

2026-07-25: Confirmed the need for a local exception mechanism while keeping it deliberately small. Stage 3 supports only whole-diagram suppression comments; line, range, next-line, disable/enable, file-prose, and unused-suppression behavior remains deferred.

2026-07-25: Superseded the preceding source-suppression decisions after reconsidering their cost. Stage 3 no longer parses Mermaid comments as rule-control directives and removes the suppression parser, diagnostic, skip reason, fixtures, and documentation branch. Rule disabling is config-only through base `off` settings and per-file overrides; one-shot CLI disable flags are deferred until real usage establishes their precedence requirements.

2026-07-25: Fixed architecture-document timing. Milestone 1 now updates the active tree, Rules/fix boundaries, current focused checker, and stale Stage 0 transition after boundary tests but before product code; Milestone 6 only records implementation-proven refinements, completion status, and final evidence.

2026-07-25: Deferred user-visible prerequisite-skip metadata until Stage 5. Stage 3 keeps prerequisite checks internal, proves gated rules are not invoked, and adds no `ruleSkips` field, skip-reason types, JSON projection, Markdown mapping, or terminal behavior.

2026-07-25: Deferred the `facts` prerequisite until Stage 5 as well. Stage 3 now implements only `text | syntax-valid`, removing an unreachable branch and its fixture tests; Stage 5 introduces `facts`, completeness handling, and observable skip metadata together while the rule seam is still private.

2026-07-25: Confirmed the exact-pinned Zod dependency because it directly reduces strict option/config validation work. Its runtime ownership remains limited to `src/validation/rules/options-schema.ts`, and all exposed rule-schema results remain project-owned.

2026-07-25: Confirmed that Stage 3 keeps custom-rule registration repository-private and proves openness only through an external-style fixture. Package exports, declarations, config-supplied modules, dynamic plugin loading, security policy, and compatibility promises remain Stage 6 concerns.

2026-07-25: Superseded collection-wide plan blocking with file-level isolation. Each document remains all-or-nothing, but a conflict, invalid edit, safety failure, or non-idempotence leaves only that document unchanged while other safe plans may still be applied; aggregate exit precedence remains unchanged.

2026-07-25: Extended file-level isolation through filesystem writes. A bounded `input/write-failed` keeps that document's original result, later safe writes still run, and the obsolete fail-fast `not-attempted` application state and tests were removed.

2026-07-25: Collapsed the previously separate public plan/application statuses into one final `fix.status`: `unchanged`, `previewed`, `applied`, `blocked`, or `write-failed`. Detailed `DocumentFixStatus` stays internal, while stable Findings explain why a document was blocked.
