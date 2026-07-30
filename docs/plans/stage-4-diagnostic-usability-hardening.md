# Make approximate Mermaid diagnostics honest and actionable

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintain this document in accordance with `PLANS.md` at the repository root. `DRAFT-PLAN.md` controls product scope and delivery stages, `ARCHITECTURE.md` controls module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` fixes exact-pinned official Mermaid as the sole canonical syntax authority. This plan is a focused diagnostic-usability hardening pass over the completed Stage 1 through Stage 4 behavior. It does not start Stage 5 Semantic Facts, change the canonical verdict, add a dependency, or reactivate visual work.

## Purpose / Big Picture

After this work, a user who receives an upstream Mermaid parser position can immediately tell whether that position is exact, approximate, or only document-level. Terminal and language-server diagnostics will no longer render an approximate range as if it identified an exact token. A terminal diagnostic will retain its compiler-style first line, show a bounded line of source from the original host document, and display any advisory help separately from the canonical error message. A language-server diagnostic will carry the same precision and help semantics in its message while continuing to use host-document UTF-16 ranges.

The real regression that motivates the work is a Sequence diagram Note containing `;<br/>`. Exact-pinned Mermaid 11.16.0 rejects the diagram, reports diagram line 15 column 49, and points near the `b` of `<br/>`; the semicolon is at column 47 and is the character that makes the following label text parse as a new statement. Replacing only the semicolon with a comma makes the diagram valid. The validator correctly maps diagram line 15 to the original Markdown host line, but its current terminal and LSP projections hide `locationPrecision: "approximate"`. The result is a correct verdict with a misleading presentation.

The completed behavior must be visible with one built CLI invocation. For a local Markdown regression fixture, the first line remains parseable as `path:line:column: severity code`, explicitly says `[approximate]`, the following code frame shows the host Markdown line without an exact-token caret, and a separate help line explains the high-confidence Sequence Note semicolon case. JSON-v2 continues to expose the existing host `span`, `locationPrecision`, and optional `help` fields without adding an `engineLocation` field or changing `schemaVersion`. Valid input remains silent in terminal mode.

## Progress

- [x] (2026-07-30 12:20Z) Read all of `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 1 through Stage 4 plans relevant to diagnostics, and the current validation, canonical-syntax, CLI, JSON, LSP, fixture, and test code.
- [x] (2026-07-30 12:20Z) Reproduced the motivating case with official Mermaid 11.16.0, confirmed the reported diagram coordinate `15:49`, counted the semicolon at column 47, confirmed comma/removal/escaped variants are accepted, and revalidated the repaired external wiki as 37 documents, 19 diagrams, zero findings, and a complete collection under supported Node 22.22.2.
- [x] (2026-07-30 12:20Z) Defined the scope and ownership decisions in this standalone ExecPlan: host spans remain the only external location, advisory help belongs to Diagram Validation, and terminal/LSP formatting remains adapter-owned.
- [x] (2026-07-30 12:25Z) Reviewed the authored plan against every mandatory `PLANS.md` section, current paths and interfaces, Stage 4 architecture ownership, active-stage limits, bounded-output and Unicode risks, exact non-goals, and the unavailable local Node 24 precondition; whitespace and path checks passed, and implementation remains unstarted.
- [ ] Milestone 1: add the repository-local regression fixture, normalize ambiguous upstream coordinate wording, and attach conservative syntax help without changing the official verdict or source mapping.
- [ ] Milestone 2: expose precision, bounded host context, and help through terminal and LSP delivery adapters while leaving JSON-v2 structurally unchanged.
- [ ] Milestone 3: update current user documentation, run the focused and full dual-runtime gates, complete a falsification-oriented review, and record actual evidence in this living plan.

## Surprises & Discoveries

- Observation: The official rejection and the useful root-cause character are different kinds of evidence.
  Evidence: Mermaid 11.16.0 returns `location: { line: 15, column: 49 }` with `locationPrecision: "approximate"`; column 49 is the `b` of `<br/>`, while the semicolon at column 47 is proven causal by minimal accepted variants. The implementation must preserve the upstream location and must not rewrite it to column 47.

- Observation: The upstream Sequence lexer explains the minimal experiment without making its coordinate exact.
  Evidence: The installed Mermaid 11.16.0 Sequence parser source map shows a lexer rule for `;` returning the same token as a newline. That explains why text after the semicolon is parsed as another statement. It does not establish a universal column correction or make Jison recovery coordinates exact.

- Observation: Core and JSON already carry the precision that human-facing adapters hide.
  Evidence: `src/validation/findings.ts` requires `locationPrecision`; `src/validation/canonical-syntax/normalize-mermaid-error.ts` marks every usable official parser coordinate `approximate`; and `src/cli/json-v2-output.ts` projects the field. `src/cli/terminal-output.ts` prints only a plain line and column, while `src/lsp/diagnostics.ts` publishes the range and raw normalized message without a precision label.

- Observation: Advisory help is already part of the stable project-owned Finding, so no new public field is needed.
  Evidence: `Finding.help` exists, rule findings already populate it, and JSON-v2 already projects it. Syntax findings do not currently populate it, and terminal/LSP projections do not currently show help from any Finding.

- Observation: The Stage 0 compatibility corpus is evidence, not the product regression suite.
  Evidence: `fixtures/compatibility/` is held at 27 fixtures and 108 observations by ADR 0001 and compatibility snapshots. Product CLI, Markdown, rule, and LSP fixtures already live under `tests/fixtures/`. The new real-world regression therefore belongs under `tests/fixtures/markdown/` and must not change compatibility counts.

- Observation: A code-frame dependency was intentionally deferred, but the motivating real use now proves value for a small project-owned formatter.
  Evidence: The Stage 1 plan says a code frame can be reconsidered when real use shows material benefit. The current case does so, but a dependency remains unnecessary: one bounded host line and one explanatory note are enough, and the first compiler-style line can remain intact.

- Observation: The repository selects Node 24.18.0, but the currently available local NVM directory observed while authoring this plan contains Node 22.22.2 and not Node 24.18.0.
  Evidence: `.nvmrc` contains `24.18.0`; `/Users/wangzhihao/.nvm/versions/node` currently lists `v22.22.2` and `v23.3.0` among older runtimes but no `v24.18.0`. The implementation must not claim a Node 24 gate until that supported runtime is actually available and used, and must not substitute unsupported default Node 23.

## Decision Log

- Decision: Treat this work as post-Stage-4 diagnostic hardening and keep Stage 5 not started.
  Rationale: The work improves existing syntax Findings, source-location presentation, CLI output, and LSP diagnostics. It adds no Semantic Facts interface, facts adapter, semantic rule, later delivery adapter, or new product capability outside the active non-visual roadmap.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Preserve official Mermaid 11.16.0 as the only canonical syntax verdict and preserve every upstream location exactly as normalized today.
  Rationale: The validator must report what the pinned renderer ecosystem accepts or rejects. A local heuristic may explain a likely cause, but it cannot change acceptance, `Finding.code`, severity, validity, diagram type, span, or location precision.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Keep the project-owned `Finding.span` in original host-document UTF-16 offsets and do not add `engineLocation` to Finding, JSON, LSP data, or another external contract.
  Rationale: CLI and editor consumers need one actionable coordinate system. A second diagram-relative field would expose an upstream implementation detail, duplicate location state, and invite consumers to treat an approximate engine coordinate as exact. The normalized internal Syntax Outcome may continue to carry diagram-relative line and column because Diagram Validation needs them to construct the host span.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Never shift, search, or snap an official approximate column to a nearby punctuation character.
  Rationale: The motivating semicolon happens to be two columns left of the reported coordinate, but parser recovery differs across Mermaid diagram grammars and errors. Root-cause help and displayed location are separate concerns.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Normalize Jison-style `Parse error on line N:` boilerplate to `Parse error near diagram line N` and omit the upstream inline excerpt and caret from the stable message.
  Rationale: The current message embeds an unlabeled diagram-relative line and an exact-looking caret while the Finding prefix uses host coordinates. The bounded host code frame replaces the useful context, and the word `near` truthfully matches approximate precision. Other error families retain the existing collapsed, expected-token-stripped, 500-code-unit-bounded detail.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Produce syntax help in the root Diagram Validation module, not in the Canonical Syntax worker or a delivery adapter.
  Rationale: Canonical Syntax should normalize the official outcome; Diagram Validation owns translation into stable user-facing Findings; delivery adapters should only project those Findings. A new internal `src/validation/syntax-help.ts` helper can inspect project-owned source text, diagram type, and normalized line without importing raw Mermaid types or crossing an adapter boundary.
  Date/Author: 2026-07-30 / Codex.

- Decision: Record `src/validation/syntax-help.ts` in `ARCHITECTURE.md` without writing a new ADR.
  Rationale: The new file belongs to an existing root Diagram Validation responsibility and does not change an import edge, module owner, dependency, external interface, or canonical engine. Keeping the accepted active structure accurate is required; this is a documented filename/capability refinement rather than an architecture decision.
  Date/Author: 2026-07-30 / Codex.

- Decision: Make the first syntax-help detector deliberately narrow: only a rejected `sequence` diagram, on the Mermaid-reported line, with a Sequence `Note` statement whose text contains the literal sequence `;<br/>`.
  Rationale: This exact shape is backed by the real failure and pinned grammar. Broader claims about every semicolon, HTML tag spelling, multiline Note, or parser family would increase false-positive risk without evidence. The help is advisory only and offers no automatic edit.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Show `[approximate]` and `[document]` on terminal Findings, omit a precision marker only for `exact`, and preserve the existing `path:line:column:` prefix.
  Rationale: Non-exact locations must not look exact, while compiler and editor integrations commonly recognize the prefix. The marker belongs after the diagnostic code and before the message so the leading coordinate grammar remains stable.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Render one bounded host source line for every Finding with a valid span, but never render a single-character caret for an approximate or document-level location.
  Rationale: Host context is useful for both exact rules and approximate syntax errors. The existing line and column remain the navigation anchor. A plain source line plus a precision note is honest; an exact-looking caret would recreate the original problem. The formatter must cap untrusted source output and handle CRLF and surrogate pairs without emitting malformed text.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Prefix LSP messages with `[approximate location]` or `[document-level location]`, leave exact messages unprefixed, and append `Help: ...` when the Finding has help.
  Rationale: LSP has a required range but no standard location-precision field. A visible message label communicates the same core semantics without inventing custom `Diagnostic.data`, changing the Finding contract, or making LSP import CLI formatting code.
  Date/Author: 2026-07-30 / Codex.

- Decision: Keep JSON-v2 schema version 2 and its field set unchanged.
  Rationale: JSON already expresses host span, location precision, and optional help correctly. The implementation should add a syntax `help` value only when the conservative detector fires and should add an explicit regression assertion that no `engineLocation` appears.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Keep valid terminal output silent and do not add a default collection summary or a `--summary` option in this plan.
  Rationale: Collection summary is already available in JSON-v2 and was not selected as high-leverage work. Adding an option or making successful terminal scans noisy is an independent CLI product decision.
  Date/Author: 2026-07-30 / User and Codex.

- Decision: Add no dependency, version bump, package export, commit, tag, push, or publication in this plan.
  Rationale: The required implementation fits existing TypeScript, Node, Vitest, CLI, and LSP capabilities. The package remains private and repository instructions require separate authorization for Git publication actions.
  Date/Author: 2026-07-30 / Codex.

## Outcomes & Retrospective

Planning outcome: complete. The plan converts one real external failure into a bounded product regression and resolves the important design choices before implementation: canonical verdict versus heuristic advice, host versus diagram coordinates, precision presentation in each delivery adapter, code-frame bounds, and explicit non-goals. Implementation and acceptance remain pending.

At implementation completion, replace this paragraph with the actual user-visible behavior, focused and full test counts, exact Node runtimes, compatibility counts, review findings, and any remaining limitations. Compare the result against the motivating Sequence Note case and record whether the narrow help detector remained sufficiently conservative.

## Context and Orientation

The repository is one private TypeScript ESM package rooted at `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. pnpm manages exact-pinned dependencies. Node 24.18.0 is selected by `.nvmrc`; `package.json` supports Node `^22.13.0 || >=24.0.0`. The current private tool version is 0.3.0. Stage 4 is complete and Stage 5 is not started.

A **Document Snapshot** is the immutable host document passed to Diagram Validation. Its text may be a standalone Mermaid file or a Markdown file containing exact-lowercase `mermaid` fences. A **host document** is that original file or editor buffer. An **embedded diagram** is the Mermaid source extracted from a Markdown fence. Host and embedded line numbers can differ.

A **Syntax Outcome** is the internal Canonical Syntax result. The serialized worker returns acceptance, syntax rejection, unsupported type, or infrastructure failure. For syntax rejection it may contain diagram-relative line and column supplied by Mermaid. It never leaves the Canonical Syntax/Diagram Validation seam and is not a public JSON or package API.

A **Finding** is the project-owned diagnostic returned by Diagram Validation. Its optional `span` is always a half-open range of zero-based UTF-16 offsets in the original host document. `locationPrecision` is `exact`, `approximate`, or `document`: exact means the validator owns the precise range, approximate means the range is useful for navigation but is not a token guarantee, and document means no trustworthy narrower location exists. `help` is optional advisory text and never changes validity.

The current data flow is:

    raw Mermaid error
      -> src/validation/canonical-syntax/normalize-mermaid-error.ts
      -> internal Syntax Outcome with diagram-relative location
      -> src/validation/validate-document.ts
      -> project-owned Finding with host span and precision
      -> CLI terminal, JSON-v2, or LSP projection

`src/validation/canonical-syntax/mermaid-runtime.ts` is the only product file allowed to import Mermaid or JSDOM. It detects the diagram family opportunistically and always awaits official `mermaid.parse()` for the canonical verdict. `src/validation/canonical-syntax/normalize-mermaid-error.ts` is the only product file that understands raw Mermaid error shapes. It currently collapses the raw message, strips expected-token tails, keeps at most 500 UTF-16 code units, chooses structured line and column, and marks any usable coordinate approximate.

`src/validation/validate-document.ts` converts a Syntax Outcome into a Finding. For Markdown it validates each extracted diagram and projects the diagram-relative span through `src/validation/markdown/` into the original host text. This root validation layer owns stable diagnostic meaning and is therefore where syntax help must be attached. Add `src/validation/syntax-help.ts` as a private root-validation helper; do not export it from `src/validation/index.ts`.

`src/cli/terminal-output.ts` owns terminal formatting. It currently derives one-based host line and column from a Finding's host offset and emits one compiler-style line. It hides location precision, source context, and help. `src/cli/json-v2-output.ts` already emits host span, `locationPrecision`, and optional `help`; it requires no structural change. CLI modules may import only their own files and `src/validation/index.ts`.

`src/lsp/diagnostics.ts` owns conversion from Findings to LSP Diagnostics. It currently converts host UTF-16 offsets to zero-based LSP ranges and preserves code, severity, and message. A Finding without a valid span is anchored at `(0,0)–(0,0)`. It hides location precision and help. LSP modules may import only their own files and `src/validation/index.ts`; they must not import CLI formatting helpers.

Product regression fixtures belong under `tests/fixtures/`. `tests/contract/validation/` proves the public in-memory module seam, `tests/internal/` may deep-import focused private helpers, `tests/integration/cli/` invokes the built CLI, and `tests/integration/lsp/` invokes the built stdio server. `fixtures/compatibility/` and `tests/compatibility/` remain unchanged Stage 0 evidence.

The relevant architectural invariants are mandatory throughout implementation. Official Mermaid remains the only syntax authority. Diagram Validation never imports a delivery adapter. CLI and LSP do not import each other. Raw upstream values never cross the Diagram Validation interface. No product module imports Compatibility Evidence or tests. No future-stage or visual module is created. TypeScript source remains under `src/`, generated JavaScript remains under `dist/`, and all external versions remain exact-pinned.

## Plan of Work

### Milestone 1: Lock the regression and improve the core Finding

At the end of this milestone, the repository contains a self-contained Markdown fixture reproducing the Sequence Note failure. Official Mermaid still supplies the rejection and approximate location, Diagram Validation maps it to the host document, the stable message labels the internal diagram line without an exact-looking caret, and a conservative advisory help string explains only the proven `;<br/>` case. Delivery adapters may still show their old formatting until Milestone 2, but JSON-v2 and the in-memory Finding already expose the new help.

Create `tests/fixtures/markdown/sequence-note-semicolon.md`. Copy a minimal, readable Sequence diagram derived from the real case rather than depending on the external `modern-agent` checkout. Include enough host prose before the fence to prove that diagram line and host line differ. The failing line must be a Sequence `Note` statement containing this exact text shape:

    Note over B: valid history stays unchanged;<br/>damaged pairs are repaired locally

Do not put this fixture under `fixtures/compatibility/` and do not add it to the compatibility manifest.

Refactor `src/validation/canonical-syntax/normalize-mermaid-error.ts` without changing how structured coordinates are selected. Keep preferring `hash.loc.first_line` over `hash.line`, keep converting `first_column` from zero-based to one-based, and keep `locationPrecision: "approximate"` for every usable parser coordinate. Change only the useful-message policy for a collapsed message that begins with Jison-style `Parse error on line N:`. Return `Parse error near diagram line N`, using the selected structured line when available, and discard the upstream inline excerpt, dashed pointer, and caret. Continue stripping expected-token tails and bounding every other message to 500 UTF-16 code units. Do not include raw hashes, tokens, stacks, or snippets in the Syntax Outcome.

Add `src/validation/syntax-help.ts`. This is an internal Diagram Validation helper, not a rule plugin and not an exported interface. Define a small project-owned input and function:

    export interface SyntaxHelpInput {
      readonly source: string;
      readonly diagramType?: string;
      readonly line?: number;
    }

    export function helpForSyntaxError(input: SyntaxHelpInput): string | undefined;

The function treats `line` as one-based in the embedded or standalone Mermaid source. It returns no help unless all of these conditions hold: `diagramType` is exactly `sequence`; `line` is a finite positive integer that resolves to a real source line; that line is a case-insensitive Sequence `Note` statement with one of the existing placements `left of`, `right of`, or `over`; and the Note text after its colon contains the literal sequence `;<br/>`. Resolve CRLF without leaving a trailing carriage return. Do not search adjacent lines, infer a token from the approximate column, reparse speculative variants, or emit a fix.

Use one bounded constant help string. Its meaning must be equivalent to:

    In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.

In `src/validation/validate-document.ts`, when mapping a `syntax-error` Syntax Outcome, call `helpForSyntaxError()` with the source, normalized diagram type, and normalized line. Copy the returned value into `Finding.help` only when present. Do not change the Finding's code, severity, message source, host span, precision, engine metadata, or validity. Do not add help to accepted, unsupported-type, or infrastructure outcomes.

Add `tests/internal/canonical-syntax/normalize-mermaid-error.test.ts`. Test the real raw-error shape with line 15 and column 49. Assert that the message is `Mermaid syntax error: Parse error near diagram line 15`, contains neither the upstream source excerpt nor `^`, preserves `{ line: 15, column: 49 }`, and remains approximate. Also test one generic non-Jison error to prove the existing collapse, expected-token removal, and bound remain intact.

Add `tests/internal/validation/syntax-help.test.ts`. Cover the exact `;<br/>` Sequence Note case and negative cases for another diagram family, a Sequence error line without `;<br/>`, a semicolon used as a separator before a plausible second statement, an invalid or missing line, and a different source line containing the pattern. These tests must prove that the detector is line-local and conservative.

Extend `tests/internal/validation/outcome-mapping.test.ts` to prove that syntax help crosses into a Finding and infrastructure debug detail still does not. Extend `tests/contract/validation/validate-document.test.ts` with an end-to-end test over the new Markdown fixture. Assert rejection, `mermaid/syntax-error`, `sequence`, `approximate`, host-bounded span on the host line containing the Note, normalized diagram-line wording, and the advisory help. Derive a fixed copy in memory by replacing only `;<br/>` with `,<br/>`; assert that official validation accepts the fixed document with no syntax Finding. Do not assert that the approximate span begins on the semicolon or any exact column.

Run the focused Milestone 1 tests under a supported Node runtime. Before the implementation they should expose the missing message/help behavior; after the implementation they must pass. Do not continue to adapter formatting while the canonical and contract tests are red.

### Milestone 2: Make delivery adapters honest and useful

At the end of this milestone, terminal and LSP users can see location precision and help. The terminal keeps its compiler-style first line, adds bounded host context, and does not draw an exact caret for a non-exact location. JSON remains schema version 2 and gains only the already-supported optional `help` value on the motivating syntax Finding.

Refactor `src/cli/terminal-output.ts` inside the CLI module. Preserve the existing one-based host line and column calculation and the empty string for zero Findings. Keep the first line in this grammar:

    /absolute/path:line:column: severity code [precision]: message [fixable]

The coordinate segment remains omitted when no span exists. Omit `[precision]` for `exact`; render `[approximate]` for `approximate`; and render `[document]` for `document`. Keep `[fixable]` at the end of the first line. This first-line preservation is required so existing compiler-style consumers can still recognize the path and coordinates.

After the first line, render one host source line whenever the Finding has a bounded span. Use the one-based host line number and a vertical separator. Strip a trailing carriage return. Cap displayed source to 160 UTF-16 code units. When the host line is longer, choose a deterministic window containing the span start and add ASCII `...` on the truncated side or sides. Adjust a cut that would split a UTF-16 surrogate pair so terminal output never contains an unmatched surrogate. A multi-line span displays only its start line.

Do not draw `^` or a one-character underline. For an approximate Finding, add an indented note equivalent to `location is approximate; inspect this host line`. For a document-level Finding, add an indented note equivalent to `location applies to the document`. An exact Finding needs no precision note because the first-line coordinate and core span are exact. If the Finding has `help`, add a separate indented `help: ...` line after the code frame and precision note. This generic projection also makes existing rule help visible; it must not reinterpret or generate help inside the CLI.

The motivating terminal transcript should have this shape, with actual host line numbers derived from the local fixture:

    .../sequence-note-semicolon.md:HOST_LINE:HOST_COLUMN: error mermaid/syntax-error [approximate]: Mermaid syntax error: Parse error near diagram line DIAGRAM_LINE
      HOST_LINE |     Note over B: valid history stays unchanged;<br/>damaged pairs are repaired locally
                | location is approximate; inspect this host line
                | help: In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.

Update `tests/unit/cli/reporters.test.ts`. Preserve coverage for CRLF and UTF-16 coordinates. Change the approximate snapshot to include the marker and code frame. Add or extend cases for exact precision with no marker, document precision, a Finding without a span, visible help, a long line truncated around the span, and an astral Unicode character at a truncation boundary. Keep valid output empty. Update existing CLI tests whose exact terminal expectations now gain help or precision markers, but do not weaken them to merely search for a filename.

In `src/lsp/diagnostics.ts`, keep the existing range, severity, code, and fixed source projection. Build the diagnostic message from the Finding using adapter-local formatting. Prefix `[approximate location] ` for approximate precision and `[document-level location] ` for document precision; leave exact messages unprefixed. If help exists, append a newline followed by `Help: ` and the help text. Do not add custom `Diagnostic.data`, do not import a CLI helper, and do not change Code Action matching except for updating tests to use the newly visible diagnostic message.

Update `tests/internal/lsp/diagnostics.test.ts` to prove exact, approximate, and document message projection, help projection, unchanged UTF-16 ranges, and unchanged document-origin fallback. Add one real-process assertion in `tests/integration/lsp/lsp.test.ts` or `tests/integration/lsp/parity.test.ts` using an unsaved Markdown buffer with the regression source. It must observe an approximate location label and help while still receiving the host-document LSP range. Keep CLI/LSP core Finding parity: the adapters may format messages differently, but both must originate from the same core code, severity, host span, precision, and help.

Extend `tests/integration/cli/cli.test.ts` to invoke the built CLI on `tests/fixtures/markdown/sequence-note-semicolon.md` in terminal and JSON modes. Terminal mode must exit 1, preserve the path/host coordinate prefix, include `[approximate]`, show the Note host line, omit an exact caret, and show help. JSON mode must exit 1 and contain schema version 2, a complete one-document collection, the host span, `locationPrecision: "approximate"`, diagram type `sequence`, engine version 11.16.0, and help. Assert that serialized JSON contains no `engineLocation`, raw hash, stack, expected-token array, or debug detail.

Run the focused reporter, CLI, LSP, validation, and canonical tests after the edits. Build before process-level integration tests so `dist/` matches `src/`. Do not update documentation until the complete focused behavior is green.

### Milestone 3: Document, verify, and close the hardening pass

At the end of this milestone, current documentation describes the behavior users actually see, the ordinary full gate and compatibility evidence pass under both supported Node lines, and a separate review has tried to falsify the claims. Stage 5 remains not started and the package remains private 0.3.0.

Update `README.md` where terminal output is described. Preserve the statement that valid input with no findings is silent. Show one compiler-style diagnostic with `[approximate]`, a bounded host source line, and a separate help line. Explain in plain language that terminal coordinates always refer to the original host document and that `approximate` means navigation near the parser's reported area rather than an exact token.

Update `docs/reference/json-output-v2.md` without changing `schemaVersion`. Clarify that syntax help is project-owned advisory text and never changes the official Mermaid verdict. State explicitly that JSON exposes only the host `span`; no diagram-relative `engineLocation` is part of the contract. Update or add a small syntax Finding example with `locationPrecision: "approximate"` and `help`.

Update `docs/reference/language-server.md` to explain the visible precision prefixes, help suffix, and unchanged host UTF-16 range semantics. State that an approximate LSP range is useful for navigation but must not be interpreted as an exact token selection. Do not promise custom Diagnostic data or editor rendering behavior outside the protocol payload.

Update `ARCHITECTURE.md` after the behavior is green. Add `syntax-help.ts` to the Stage 4 active `src/validation/` tree and state in the Diagram Validation responsibility prose that project-owned advisory syntax help is attached while translating an internal Syntax Outcome into a Finding. Do not change the dependency diagram, import allowlist, package shape, canonical engine, or delivery-adapter ownership, and do not write an ADR because no load-bearing architecture decision changes.

Do not edit `DRAFT-PLAN.md` or ADR 0001 merely to record this implementation. Their stage scope, canonical engine, and no-code-frame-dependency decisions remain true. If implementation evidence requires a new dependency, a second external location field, a reversed import edge, another canonical engine, a Stage 5 module, or a visual component, stop and amend the roadmap/architecture/ADR through a separately reviewed decision instead of completing this plan.

Run the full gate once under Node 24.18.0 and once under an installed Node 22 version satisfying `^22.13.0`; record the exact Node 22 patch version. Pair each runtime with `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm compatibility`. Run these commands serially because the repository intentionally serializes process-heavy test files. The baseline before this plan is 29 ordinary test files and 264 ordinary tests passing, plus one opt-in LSP performance file/test skipped. The implementation intentionally adds tests and likely adds two internal test files, so update this plan with the actual final counts rather than preserving the baseline numbers mechanically. Compatibility must remain exactly 4 files/16 tests over 27 fixtures/108 observations with its existing two noncanonical Pie mismatches, five coordinate expectations, and 12 complete selected Merman fact summaries.

Perform a separate falsification-oriented read-only review of the final worktree. The review must try to find cases where an approximate location still looks exact, host and diagram coordinates are confused, help can fire on an unrelated error, the code frame leaks an unbounded line or breaks Unicode, JSON accidentally gains `engineLocation`, CLI and LSP diverge from the core Finding, a valid terminal run becomes noisy, or Compatibility Evidence changes. Resolve every concrete issue and rerun tests proportional to the changed surface; any source/test change after the full gates requires rerunning both full runtime gates.

Finish by updating every living section of this plan and appending a dated Revision Note with actual outcomes. Run `git diff --check`, inspect the complete diff and status, and stop without staging, committing, tagging, pushing, publishing, or beginning Stage 5.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix. Use pnpm for Node work and patch-based edits for repository files. Never edit generated `dist/` files directly.

Inspect and record the baseline:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch --untracked-files=all
    rtk git log -1 --oneline
    rtk sed -n '1,20p' .nvmrc
    rtk ls /Users/wangzhihao/.nvm/versions/node
    rtk rg -n 'locationPrecision|help|Parse error on line|formatTerminal|projectValidationResult' src tests docs README.md

After Milestone 1 source and tests are present, run focused in-memory tests under a supported Node runtime. The currently installed supported runtime observed during planning is Node 22.22.2:

    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node node_modules/vitest/vitest.mjs run tests/internal/canonical-syntax/normalize-mermaid-error.test.ts tests/internal/validation/syntax-help.test.ts tests/internal/validation/outcome-mapping.test.ts tests/contract/validation/validate-document.test.ts

After Milestone 2, typecheck, build, and run the focused adapter tests:

    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit
    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node node_modules/typescript/bin/tsc -p tsconfig.build.json
    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node node_modules/vitest/vitest.mjs run tests/unit/cli/reporters.test.ts tests/integration/cli/cli.test.ts tests/internal/lsp/diagnostics.test.ts tests/integration/lsp/lsp.test.ts tests/integration/lsp/parity.test.ts

Exercise the built regression manually. Replace `HOST_LINE`, `HOST_COLUMN`, and `DIAGRAM_LINE` in this plan with the observed stable values after the fixture is checked in:

    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node dist/cli/main.js tests/fixtures/markdown/sequence-note-semicolon.md
    rtk /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin/node dist/cli/main.js --format json tests/fixtures/markdown/sequence-note-semicolon.md | rtk jq '{schemaVersion, complete, valid, documents, summary}'

The terminal command must exit 1 and produce the shape documented in Milestone 2. The JSON command must exit 1, remain parseable schema version 2, include the host span, approximate precision, and help, and contain no `engineLocation`.

For final acceptance, use Node 24.18.0 from `.nvmrc` and one Node 22 runtime satisfying the package engine range. At planning time Node 24.18.0 is not installed in the observed NVM directory. If it remains unavailable, obtain approval to install or otherwise provide that supported runtime; do not substitute Node 23 and do not report the Node 24 gate as passed. Once present, use explicit PATH values so pnpm and Node agree. The expected paths are:

    Node 24 PATH: /Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin
    Node 22 PATH: /Users/wangzhihao/.nvm/versions/node/v22.22.2/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin

Run the primary Node 24 matrix serially:

    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v24.18.0/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility

Run the secondary Node 22 matrix serially and record the actual patch version:

    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.22.2/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' node --version
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.22.2/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm install --frozen-lockfile
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.22.2/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm check
    rtk proxy env PATH='/Users/wangzhihao/.nvm/versions/node/v22.22.2/bin:/Users/wangzhihao/Library/pnpm:/usr/bin:/bin:/usr/sbin:/sbin' pnpm compatibility

Finish with scoped integrity checks:

    rtk git diff --check
    rtk git status --short --branch --untracked-files=all
    rtk git diff -- src/validation/canonical-syntax/normalize-mermaid-error.ts src/validation/syntax-help.ts src/validation/validate-document.ts src/cli/terminal-output.ts src/lsp/diagnostics.ts tests/fixtures/markdown/sequence-note-semicolon.md tests/internal/canonical-syntax/normalize-mermaid-error.test.ts tests/internal/validation/syntax-help.test.ts tests/internal/validation/outcome-mapping.test.ts tests/contract/validation/validate-document.test.ts tests/unit/cli/reporters.test.ts tests/integration/cli/cli.test.ts tests/internal/lsp/diagnostics.test.ts tests/integration/lsp/lsp.test.ts tests/integration/lsp/parity.test.ts README.md ARCHITECTURE.md docs/reference/json-output-v2.md docs/reference/language-server.md docs/plans/stage-4-diagnostic-usability-hardening.md
    rtk rg -n 'engineLocation|column.*[-+] *2|locationPrecision|approximate location|document-level location|help:' src tests docs README.md
    rtk rg -n 'playwright|puppeteer|mermaid-cli|sharp|pngjs|pixelmatch|openai' package.json pnpm-lock.yaml src tests

Historical plan examples and JSON-v1 documentation may still contain their historical output. Do not rewrite historical evidence mechanically. Current README and current reference pages must match the new behavior.

## Validation and Acceptance

The plan is complete only when all of the following user-observable behavior is true.

The repository-local Markdown regression is rejected by exact-pinned official Mermaid 11.16.0 through the normal worker and public `validateDocument()` operation. Replacing only `;<br/>` with `,<br/>` makes the same document valid. No local heuristic changes either verdict.

The syntax Finding has code `mermaid/syntax-error`, error severity, source `mermaid`, diagram type `sequence`, engine version 11.16.0, a host-document span, and `locationPrecision: "approximate"`. Its stable message says `Parse error near diagram line N` and contains no upstream inline caret. Its help is present only for the proven same-line Sequence Note `;<br/>` shape. Negative detector fixtures produce no help.

The host span remains the location contract. No Finding, JSON object, LSP Diagnostic data, README example, or current reference defines `engineLocation`. No code searches around the approximate column or moves it to the semicolon. Contract tests assert only that the span is host-bounded and falls on the responsible host line.

Terminal mode exits 1 for the regression. Its first line preserves absolute host path and one-based host line/column, includes `[approximate]`, and labels the normalized message's line as a diagram line. A bounded host line follows. There is no exact-token caret. A separate help line follows. Exact Findings omit the precision marker; document-level Findings say `[document]`. Existing fixable Findings still end with `[fixable]`. Valid input with no Findings still exits 0 with empty stdout and stderr.

Terminal source context never emits more than 160 source UTF-16 code units plus bounded prefixes and ASCII ellipses for one Finding. CRLF does not print a carriage return. A truncation boundary never leaves an unmatched surrogate. Multiple Findings remain deterministic and ordered.

JSON mode exits 1 for the regression and remains schema version 2. It reports a complete collection, the host span, approximate precision, diagram type, engine, and help. It does not contain raw Mermaid error data or `engineLocation`. JSON summary and completeness semantics remain unchanged.

The LSP publishes the same core Finding against an unsaved Markdown buffer. Its range is still derived from the host-document UTF-16 span. Its message begins `[approximate location]`, appends `Help: ...`, and does not imply an exact token. Exact diagnostics retain an unprefixed message; document-level diagnostics say `[document-level location]`. Code Actions still match current diagnostics and remain planner-backed.

No package dependency, lockfile version, product timeout, Vitest timeout, retry, skip, public export, schema version, supported diagram family, module edge, Stage 5 directory, visual feature, or Compatibility Evidence fixture changes. `ARCHITECTURE.md` records only the new root-validation helper and unchanged ownership. `pnpm compatibility` remains 27 fixtures and 108 observations.

The full ordinary gate passes on Node 24.18.0 and on the recorded supported Node 22 patch. The existing sole opt-in LSP performance skip remains the only skip. Record the increased test file/test counts in `Progress`, `Outcomes & Retrospective`, and `Artifacts and Notes`. `git diff --check` passes, and the final review finds no unresolved correctness or contract issue.

## Idempotence and Recovery

All edits are ordinary source, fixture, test, and documentation changes and are safe to apply repeatedly through patches. Rebuilding `dist/` is repeatable; never edit or commit generated JavaScript beside TypeScript source.

If Mermaid 11.16.0 does not reproduce the fixture rejection, stop and inspect the actual installed version, runtime profile, and fixture bytes. Do not weaken the fixture, switch engines, or invent a heuristic verdict. The exact-pinned official result is the precondition for this plan.

If the normalized upstream message has a new shape in another family, retain the existing bounded generic message for that family. Do not broaden the Jison regex until a local fixture and focused test establish the shape. If structured location and message line disagree, prefer the structured location already selected by `normalizeMermaidError()` and retain approximate precision.

If the syntax-help detector fires on a negative fixture, narrow it. Do not compensate by moving the help into the CLI, parsing expected-token text, reparsing multiple speculative edits, or adding an automatic fix. Deleting the negative test is not recovery.

If code-frame truncation mishandles Unicode, correct the project-owned slicing helper and retain the astral-boundary test. Do not add a code-frame, terminal-width, Unicode-width, or rendering dependency for this one-line context.

If an existing LSP Code Action test fails because the visible message changed, update its expected current Diagnostic to the newly projected message while preserving exact visible-field matching and planner safety. Do not relax Code Action matching or ignore the message field.

If Node 24.18.0 is unavailable, obtain the runtime before claiming final acceptance. A Node 22 focused run is useful implementation feedback but does not replace the required primary gate. Never use unsupported Node 23 as evidence.

Preserve unrelated worktree changes if any appear during implementation. Never use `git reset`, `git checkout --`, `git clean`, broad deletion, or a lockfile rewrite as recovery. Do not stage or commit without a separate user request.

## Artifacts and Notes

Planning-time canonical reproduction:

    original  -> syntax-error, sequence, diagram line 15 column 49, approximate
    comma     -> accepted
    noBreak   -> accepted
    escaped   -> accepted
    line 15 semicolon column -> 47
    line 15 reported column  -> 49, the `b` in `<br/>`

Planning-time repaired external wiki verification under Node 22.22.2:

    schemaVersion  2
    complete       true
    valid          true
    documents      37
    diagrams       19
    findings       0

Planning-time focused validation/reporter baseline:

    Test Files  2 passed (2)
    Tests       12 passed (12)

Repository full-gate baseline recorded by the completed Stage 4 closeout before this plan adds tests:

    Test Files  29 passed | 1 skipped (30)
    Tests       264 passed | 1 skipped (265)
    Compatibility  4 files / 16 tests / 27 fixtures / 108 observations

Replace the following placeholder with the actual final CLI transcript during implementation:

    <absolute fixture path>:HOST_LINE:HOST_COLUMN: error mermaid/syntax-error [approximate]: Mermaid syntax error: Parse error near diagram line DIAGRAM_LINE
      HOST_LINE | <bounded host Note line>
                | location is approximate; inspect this host line
                | help: <bounded advisory help>

## Interfaces and Dependencies

The external and repository-module interfaces remain unchanged. `DocumentSnapshot`, `Finding`, `ValidationResult`, `validateDocument()`, and `planDocumentFixes()` continue to cross the `src/validation/index.ts` seam. `Finding.span`, `Finding.locationPrecision`, and `Finding.help` already exist; no field is added. Canonical `SyntaxOutcome` and worker IPC remain unchanged. JSON-v2 remains schema version 2. The package remains private with no supported programmatic exports.

Add only this new internal root-validation interface in `src/validation/syntax-help.ts`:

    export interface SyntaxHelpInput {
      readonly source: string;
      readonly diagramType?: string;
      readonly line?: number;
    }

    export function helpForSyntaxError(input: SyntaxHelpInput): string | undefined;

Do not export this helper from `src/validation/index.ts`. `src/validation/validate-document.ts` may import it because both files are inside the root Diagram Validation module. The helper imports no Mermaid, Markdown, CLI, LSP, filesystem, process, Compatibility Evidence, or external package.

`src/validation/canonical-syntax/normalize-mermaid-error.ts` retains its existing exported function and coordinate contract. Only its stable message normalization changes. No raw upstream type or payload crosses `src/validation/canonical-syntax/index.ts`.

`src/cli/terminal-output.ts` and `src/lsp/diagnostics.ts` keep adapter-local formatting helpers. They may import only the public Diagram Validation seam and their own adapter files. Do not create a shared top-level reporter module, make one delivery adapter import another, or move presentation strings into Diagram Validation.

No package is added and no exact pin changes. Direct runtime dependencies remain Commander 15.0.0, Globby 16.2.2, JSDOM 26.1.0, `mdast-util-from-markdown` 2.0.3, Mermaid 11.16.0, `vscode-languageserver` 10.1.0, `vscode-languageserver-textdocument` 1.0.12, and Zod 4.4.3. Development-only compatibility and test dependencies remain unchanged.

## Revision Note

2026-07-30: Created this self-contained post-Stage-4 diagnostic-usability ExecPlan after reviewing the external wiki validation session and independently reproducing the official Mermaid rejection, source mapping, and misleading approximate-column presentation. The plan prioritizes a repository-local regression, visible precision, host context, coordinate wording, and conservative advisory help; explicitly rejects `engineLocation`, column correction, default summaries, new dependencies, automatic fixes, Stage 5 work, visual work, version changes, and Git publication actions. The planning review also required `ARCHITECTURE.md` to record the new root-validation helper while keeping every ownership rule and dependency edge unchanged, with no ADR.
