# Deliver Stage 2 repository and Markdown input

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This plan must be maintained in accordance with `PLANS.md` at the repository root. It implements only Stage 2 from `DRAFT-PLAN.md`. `ARCHITECTURE.md` remains the authority for module ownership and dependency direction, and `docs/adr/0001-validation-foundation.md` remains the authority for the exact canonical Mermaid profile and the upstream reuse boundary.

## Purpose / Big Picture

After this work, a user can point the private-checkout CLI at a documentation repository, a directory, a standalone Mermaid file, or a Markdown file. The CLI discovers supported files, honors `.gitignore` and project configuration, extracts every lowercase `mermaid` fenced code block from Markdown, validates each extracted diagram with the same official Mermaid worker used for standalone files, and reports every finding at an absolute UTF-16 range in the original host file.

The behavior is visible in two ways. Running `node dist/cli/main.js docs/` prints compiler-style findings whose paths, lines, and columns refer to Markdown rather than to a temporary extracted string. Running the same command with `--format json` emits one deterministic JSON schema-v2 repository result containing every successfully read document, a completeness marker, structured per-file read errors, and a summary. A standalone `.mmd` or `.mermaid` invocation keeps its Stage 1 terminal behavior. Stage 2 does not add rules, fixes, MDX, LSP, MCP, semantic facts, rendering, image analysis, or package-level programmatic exports.

## Progress

- [x] (2026-07-15 20:11Z) Authored this Stage 2 ExecPlan after reading `AGENTS.md`, `PLANS.md`, `DRAFT-PLAN.md`, `ARCHITECTURE.md`, ADR 0001, the completed Stage 1 plan, the current validation and CLI implementation, the current tests, and the exact-pinned `@mermaid-lint/core` extraction/discovery/configuration sources.
- [x] (2026-07-15 20:11Z) Verified the clean Stage 1 baseline on commit `cf7d827`: `pnpm check` passes, `pnpm compatibility` passes with 27 fixtures and 108 observations, and the working tree is clean.
- [x] (2026-07-15 20:11Z) Probed `mdast-util-from-markdown@2.0.3` outside the repository and confirmed the source-position behavior required by this plan, including list and blockquote dedenting, CRLF preservation, and unclosed-fence handling.
- [x] (2026-07-19 09:51Z) Resolved the first design-review branch with the user: Stage 2 configuration has only an optional `ignore` field; default discovery and explicit paths/directories make configurable inclusion globs unnecessary at this stage.
- [x] (2026-07-19 10:38Z) Resolved the second design-review branch with the user: the optional repository config has one automatic filename, `mermaid-validator.config.json`; the nearest file found by upward search supplies shared ignores and the no-argument discovery root, while `--config` remains an exact override.
- [x] (2026-07-19 10:45Z) Resolved the third design-review branch with the user: Stage 2 does not add lilconfig or Zod for a one-file, one-field JSON contract; config search, parsing, and validation use project-owned Node code, while Zod is deferred until Stage 3 rule schemas justify it.
- [x] (2026-07-19 10:48Z) Resolved the fourth design-review branch with the user: keep `ignore` simple as exclusion-only forward-slash globs relative to the config root; reject negation, absolute paths, and parent traversal, while explicit files bypass ignores.
- [x] (2026-07-19 10:51Z) Resolved the fifth design-review branch with the user: recognize only fenced code nodes whose parsed language is exactly lowercase `mermaid`; other casing is ignored rather than diagnosed.
- [x] (2026-07-19 11:09Z) Resolved the sixth design-review branch with the user: at a copied-segment join, project non-empty span starts rightward and ends leftward, project empty spans rightward, map embedded EOF to the final body boundary, and reject invalid spans without clamping.
- [x] (2026-07-19 11:44Z) Resolved the seventh design-review branch with the user: a parser-system outcome records a Finding for only the current block, then validation continues with every later block through the worker host's existing lazy restart; Stage 2 adds neither retries nor a circuit breaker.
- [x] (2026-07-19 11:57Z) Resolved the eighth design-review branch with the user: discovery of zero supported files is an exit-2 input failure, while one or more discovered Markdown files containing zero recognized Mermaid blocks is a successful validation with zero diagrams.
- [x] (2026-07-19 12:01Z) Resolved the ninth design-review branch with the user: `--format json` always emits the JSON-v2 collection envelope after Stage 2, including one-file invocations; JSON-v1 remains historical documentation rather than a selectable output mode.
- [x] (2026-07-19 12:09Z) Resolved the tenth design-review branch with the user: after successful discovery, individual file-read failures follow a ripgrep-style limited best-effort policy—report them, validate every successfully read file, mark JSON-v2 incomplete, and return an input-error exit class; configuration and discovery failures remain fatal before output.
- [x] (2026-07-19 12:19Z) Resolved the eleventh design-review branch with the user: mixed collection outcomes use strict exit precedence `3` parser/system failure, then `2` input failure, then `1` validation failure, then `0` success.
- [x] (2026-07-19 12:29Z) Resolved the twelfth design-review branch with the user: retain exact-pinned `globby@16.2.2` as the one Stage 2 discovery dependency because correct nested `.gitignore` handling is not a small project-owned filesystem helper.
- [x] (2026-07-19 12:36Z) Resolved the thirteenth design-review branch with the user: keep config ignores to a basic project-owned glob subset using literals, `/`, `*`, `?`, and `**`; reject advanced Globby syntax rather than exposing an upstream pattern dialect.
- [x] (2026-07-19 12:39Z) Resolved the fourteenth design-review branch with the user: retain exact-pinned `mdast-util-from-markdown@2.0.3` as an adapter-owned CommonMark structure dependency while official Mermaid remains the only syntax authority.
- [x] (2026-07-19 12:43Z) Resolved the fifteenth design-review branch with the user: remove custom opaque-frontmatter detection from Stage 2; test mapping after ordinary frontmatter and accept that a CommonMark-recognized fence inside metadata may be extracted until real fixtures justify dedicated support.
- [x] (2026-07-19 12:45Z) Resolved the sixteenth design-review branch with the user: an explicitly named supported file bypasses `.gitignore`, config ignores, and hard discovery exclusions, while explicit directories remain discovery requests and honor all exclusions.
- [x] (2026-07-19 13:40Z) Resolved the seventeenth design-review branch with the user: config-driven discovery and ignore patterns remain root-bounded, but a user may explicitly name a file or directory outside the config root; root-relative config ignores do not apply there.
- [x] (2026-07-19 13:42Z) Resolved the eighteenth design-review branch with the user: follow CommonMark EOF-closed fence behavior, validate the extracted body through host EOF, and do not synthesize an unclosed-fence Finding.
- [x] (2026-07-19 14:12Z) Resolved the nineteenth design-review branch with the user: when Mermaid supplies no diagram-relative location, use only the responsible block's host body span with `approximate` precision rather than the fence or whole Markdown document.
- [x] (2026-07-19 14:14Z) Resolved the twentieth design-review branch with the user: a Markdown parse, extraction, or map-invariant failure yields one atomic whole-document system result, stops any remaining block validation, and does not stop later repository documents.
- [x] (2026-07-19 14:17Z) Resolved the twenty-first design-review branch with the user: keep package version `0.1.0` through Stage 2 and make JSON-v2 the sole current private output without a JSON-v1 compatibility shim, migration, deprecation period, or stability promise.
- [x] (2026-07-19 14:50Z) Added exact runtime dependencies `mdast-util-from-markdown@2.0.3` and `globby@16.2.2`, expanded the architecture fitness checks, and added focused Stage 2 tests.
- [x] (2026-07-19 14:50Z) Implemented the internal Markdown extraction and segment-level offset-map module under `src/validation/markdown/`.
- [x] (2026-07-19 14:50Z) Extended Diagram Validation to validate standalone Mermaid and Markdown Document Snapshots through the same canonical worker and return host-relative findings plus `diagramCount`.
- [x] (2026-07-19 14:50Z) Implemented project-owned CLI configuration and repository discovery, then adapted the CLI to validate deterministic collections with bounded read failures.
- [x] (2026-07-19 14:50Z) Replaced the CLI's single-document JSON-v1 projection with documented repository-capable JSON-v2 while preserving Stage 1 terminal formatting and exit meanings.
- [x] (2026-07-19 14:50Z) Updated user, reference, architecture, roadmap, and living-plan documentation; passed frozen install, the full 20-file/115-test gate, and the unchanged compatibility gate on Node 22.20.0 and Node 24.18.0; stopped before Stage 3.
- [x] (2026-07-20 02:20Z) Hardened the two P1 source-map contracts found during implementation review: implicitly closed LF/CRLF fences now project embedded EOF to the parser's final host boundary, and structural plus host-document bounds are prevalidated before canonical requests and after every outcome projection. The current 20-file/120-test gate passes on Node 22.20.0 and Node 24.18.0 with unchanged compatibility evidence.

## Surprises & Discoveries

- Observation: The public `@mermaid-lint/core@0.35.0` extractor is not sufficient for the Stage 2 source-map contract even though ADR 0001 kept it as a reuse candidate.
  Evidence: `extractMermaidBlocks()` normalizes CRLF before scanning, exposes only the opening fence line and column, retains body indentation, replaces an unclosed body with `__UNCLOSED_FENCE__`, and its fence regular expression accepts only whitespace before a fence. It therefore cannot represent blockquote/list prefix removal or a segment-level mapping back to the original UTF-16 host text.

- Observation: The exact `mdast-util-from-markdown@2.0.3` CommonMark parser produces the right normalized body and useful original offsets for the required nested-container cases.
  Evidence: A local probe parsed both an indented list fence and a blockquote fence to `flowchart TD\n  A-->B`; each code node retained an original `position.start.offset` and `position.end.offset`. The body lines were suffixes of the original host lines after CommonMark removed list indentation or `> ` prefixes.

- Observation: The CommonMark parser preserves the source line-ending form inside a fenced code value rather than forcing LF.
  Evidence: The CRLF probe returned `flowchart TD\r\n  A-->B`. The Stage 2 map can therefore use equal-length copied segments for LF and CRLF instead of inventing a newline-normalization transform.

- Observation: An unclosed fenced code block is valid CommonMark structure extending to end of file, not an extraction error.
  Evidence: The probe returned a `mermaid` code node with body `flowchart TD\n  A-->B` and an end offset at EOF. Stage 2 must validate that body and map it through EOF; it must not create a sentinel string or a synthetic unclosed-fence Finding.

- Observation: For an implicitly closed fence ending with LF or CRLF, CommonMark omits the terminal line ending from the code value while retaining it in the node's final host boundary.
  Evidence: The implementation-review regression produced a host length one or two code units beyond the final copied segment. The offset map therefore keeps round-trip segments equal to the code value but projects embedded EOF through `hostBodySpan.endOffset`.

- Observation: A CommonMark-only parse can see fence-looking text inside top-of-file frontmatter as a code block.
  Evidence: A YAML-shaped probe containing an indented Mermaid fence produced a `mermaid` code node. After design review, Stage 2 accepts this low-probability false-positive risk rather than adding an incomplete YAML/TOML boundary scanner; ordinary frontmatter followed by a real block remains required mapping coverage.

- Observation: The live Stage 1 baseline remains healthy before Stage 2 planning changes.
  Evidence: On Node 22.20.0 with pnpm 10.30.1, `pnpm check` exited successfully. `pnpm compatibility` reported 4 passing files, 16 passing tests, 27 fixtures, 108 observations, the same two known noncanonical `pie-invalid-header` mismatches, 5/5 coordinate expectations, and 12/12 complete selected Merman fact summaries.

- Observation: Commander represents an optional variadic positional argument as one array-valued processed argument rather than flattening it.
  Evidence: The first built CLI run passed the whole path array to `path.resolve()`. Treating `program.processedArgs` as `[string[]?]` fixed single, multiple, and zero-path invocations; unit and built integration tests now cover all three.

- Observation: The CommonMark value-to-host suffix invariant held for every required container, line-ending, and Unicode case without a normalization transform.
  Evidence: Focused extraction tests pass for list-plus-blockquote nesting, LF, CRLF, BMP and astral Unicode, combining marks, empty bodies, and EOF-closed fences. Every case reconstructs the exact embedded value from copied host slices.

## Decision Log

- Decision: Keep Stage 2 strictly non-visual and stop before Stage 3 rule or fix work.
  Rationale: `DRAFT-PLAN.md` makes repository/Markdown input and host offset mapping the complete Stage 2 boundary. Adding rules, LSP, Semantic Facts, or visual dependencies would bypass later-stage exit criteria and blur source-map acceptance.
  Date/Author: 2026-07-15 / Codex

- Decision: Add `src/validation/markdown/` as an internal deep module owned by Diagram Validation.
  Rationale: CLI and the future LSP must obtain identical extraction and host-offset behavior from the in-memory validation operation. Filesystem discovery remains a delivery concern, but Markdown interpretation and projection of diagram-relative spans are domain validation behavior.
  Date/Author: 2026-07-15 / Codex

- Decision: Use exact-pinned `mdast-util-from-markdown@2.0.3` behind `src/validation/markdown/extract-markdown.ts`; do not import its nodes or types across `src/validation/markdown/index.ts`.
  Rationale: It supplies a CommonMark-compliant code-block tree and original offsets for lists, blockquotes, indentation, CRLF, and EOF-closed fences. A small local adapter can turn those nodes into project-owned copied segments, while a handwritten Markdown parser or the current mermaid-lint extractor would carry more correctness risk. `remark-gfm` is unnecessary and remains excluded.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Do not special-case YAML or TOML frontmatter in Stage 2. Extract exactly the fenced code nodes returned by the CommonMark parser, and use frontmatter fixtures only to prove that a real block after ordinary metadata retains correct source mapping. Document that a CommonMark-recognized `mermaid` fence inside metadata may also be extracted.
  Rationale: Fence-looking content inside frontmatter is uncommon, while a delimiter-only scanner would implement incomplete YAML/TOML semantics and could silently suppress real diagrams after a thematic break or unmatched opener. Dedicated frontmatter parsing can be added later when real fixtures justify the behavior.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Treat an unclosed CommonMark Mermaid fence as a block that extends to host EOF. Validate its extracted body normally, map its final boundary to EOF, and do not create a sentinel, invented closing marker, or `unclosed-fence` Finding.
  Rationale: CommonMark defines this structure without requiring a closing marker, and Stage 2 validates embedded Mermaid rather than linting Markdown structure. A synthetic Markdown error would exceed the active stage and disagree with the selected structure authority.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Recognize only CommonMark fenced code nodes whose parsed language is exactly lowercase `mermaid`. Backtick and tilde fences and optional trailing metadata are accepted; `Mermaid`, `MERMAID`, and other casing are ignored rather than reported as input errors.
  Rationale: Exact matching is a small, predictable Stage 2 contract that follows the normal Mermaid fence convention without adding normalization or warning policy.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Keep `EmbeddedSpan` and `HostSpan` as private, structurally identical Markdown-module types. Root Diagram Validation converts a projected `HostSpan` to the public `TextSpan` shape when assembling a Finding.
  Rationale: The separate names keep embedded and host coordinate spaces explicit while preserving the architecture rule that the Markdown subtree imports only its own files and does not reach upward into `src/validation/findings.ts`.
  Date/Author: 2026-07-19 / Codex

- Decision: Preserve the exact code-value line endings returned by the CommonMark parser and represent mapping as ordered copied segments with equal embedded and host lengths.
  Rationale: The probe showed LF and CRLF are preserved. Prefixes removed by CommonMark appear only as gaps between host segments. This makes every mapped UTF-16 boundary explainable without a block-start line offset or a lossy normalized-text heuristic.
  Date/Author: 2026-07-15 / Codex

- Decision: At an embedded boundary shared by adjacent copied segments, project the start of a non-empty span to the next segment's host start (right bias) and its end to the previous segment's host end (left bias). Project a zero-length span at the join entirely to the right boundary. Map embedded EOF to the final host body boundary. Return projection failure for reversed, out-of-bounds, or inconsistent spans rather than clamping.
  Rationale: CommonMark removes list indentation and blockquote prefixes between copied segments. Directional bias produces the smallest host interval containing the requested embedded text, excludes removed prefixes at either edge, keeps empty spans non-reversed, and makes every ambiguous boundary deterministic.
  Date/Author: 2026-07-19 / User and Codex

- Decision: For an embedded Finding that lacks a Mermaid-supplied sub-diagram span, attach the exact host body range and mark its location precision `approximate`.
  Rationale: `document` precision for a virtual extracted diagram would misleadingly refer to the whole Markdown host. The exact body range identifies the responsible block without including opening/closing fences or unrelated prose, while `approximate` truthfully states that no narrower token position is known. An empty body uses its zero-length boundary after the opener. Findings with Mermaid coordinates retain their existing precision after exact offset projection.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Add `system/markdown-extraction-failed` for an internal extraction or alignment failure, and never silently fall back to line arithmetic.
  Rationale: A parser exception, missing required position, broken map, or unprojectable Mermaid span makes the extracted collection and its locations untrustworthy. Treat the result as atomic within one Markdown host: prevalidate every map before canonical requests; if a later outcome still cannot project, discard accumulated Findings and stop subsequent block requests. Return one bounded system Finding with a whole-host span, `locationPrecision: "document"`, `diagramCount: 0`, `valid: false`, and exit class `3`; then continue other repository documents. The implementation must add a regression fixture before accepting any newly observed alignment shape.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Treat every returned `system/parser-*` outcome as local to the current embedded block. Record its mapped system Finding, do not retry that block, and continue every later block; the existing worker host discards the affected worker and starts a fresh one lazily for the next request. Stage 2 adds no consecutive-failure threshold or document-level circuit breaker.
  Rationale: This keeps each extracted block independently observable, preserves Stage 1's one-request semantics and recovery ownership, and avoids silently treating an unvalidated block as valid. A persistent parser outage may produce one bounded system Finding per attempted block and determines exit class `3`; operational circuit breaking is deferred until real repository evidence justifies it.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Use exact-pinned `globby@16.2.2` behind `src/cli/discovery.ts`, but do not add lilconfig or Zod in Stage 2. Implement the fixed-name upward JSON search and the strict one-field config check with project-owned Node code; introduce Zod in Stage 3 when rule option schemas justify it.
  Rationale: Globby supplies fast-glob-based file discovery plus nested `.gitignore` handling without invoking Git or adding `node:child_process` ownership to the CLI. A single `mermaid-validator.config.json` containing only optional `ignore` does not justify two additional runtime dependencies or upstream configuration contracts.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Do not move `@mermaid-lint/core` or Merman into product runtime dependencies for Stage 2.
  Rationale: The mermaid-lint extractor cannot satisfy source mapping, and its discovery defaults include deferred MDX/Markdown variants while depending on Merman. Reusing it at runtime would pull Stage 5 machinery into the default graph without removing the need for local adapters. It remains development-only Compatibility Evidence.
  Date/Author: 2026-07-15 / Codex

- Decision: Keep the Stage 2 config schema deliberately small: one optional `ignore` array of non-empty strings, with unknown keys rejected. Do not add configurable inclusion patterns in Stage 2.
  Rationale: No-argument discovery already scans every supported extension, explicit files and directories provide direct inclusion control, and `ignore` can remove generated or irrelevant areas. A `files` field would add glob-dialect and precedence policy without enabling essential Stage 2 behavior. Custom inclusion patterns remain available for a later stage if real repository use demonstrates the need.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Treat each Stage 2 `ignore` value as an exclusion-only forward-slash glob relative to the config directory. The accepted project-owned subset contains ordinary path characters plus `/`, `*`, `?`, and `**`. Reject leading `!`, absolute paths, any `..` path segment, backslashes, braces, square brackets, and parentheses. Apply accepted patterns to no-argument discovery and explicit-directory scans inside the config root; explicit files bypass them.
  Rationale: Patterns such as `docs/generated/**`, `**/*.draft.md`, and `examples/temp-?.md` cover the present need without exposing Globby brace expansion, character classes, extglobs, re-inclusion precedence, or paths outside the configured repository. Broader pattern semantics can wait for demonstrated use.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Make configuration optional and automatically search upward only for the nearest `mermaid-validator.config.json`; support an explicit `--config <path>` override that loads exactly that file. The discovered or explicit config directory is the no-argument discovery root, while the current working directory is the root when no config exists.
  Rationale: One committed JSON filename is enough to share validator-specific ignores and stable repository-wide no-argument behavior across local and CI runs. Package properties, multiple rc aliases, JavaScript, TypeScript, YAML, remote configuration, and executable loaders add ambiguity without helping Stage 2.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Make the CLI positional form `mermaid-validator [paths...]`, where each supplied path is an existing file or directory; when no path is supplied, discover from the config root using the fixed default patterns for supported extensions.
  Rationale: Existing files preserve Stage 1 direct-file behavior, directories provide the repository workflow, and fixed no-argument defaults cover the ordinary repository scan. Avoiding configurable or unexpanded command-line glob semantics keeps selection and missing-input errors deterministic across shells.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Root-bound all config-driven selection: no-argument discovery starts at the config root and config ignore patterns cannot traverse above it. Permit explicit user-supplied files and directories outside that root. Outside-root explicit directories honor their own nested `.gitignore` files and the hard discovery exclusions but not the current config's root-relative ignores; outside-root explicit files retain direct-file precedence.
  Rationale: A config or glob must not expand its authority beyond the configured repository, while an explicit path is direct user intent and preserves Stage 1's ability to validate an arbitrary named file. Keeping these authority sources distinct avoids treating an intentional path as an escape.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Treat an empty discovery result as an exit-2 input failure with no validation collection, whether it comes from no-argument discovery, an explicit directory, or ignore processing. Once at least one supported file is discovered, zero extracted Mermaid diagrams is a successful result rather than an input failure; do not add `--allow-empty` in Stage 2.
  Rationale: Returning success for zero files can hide an incorrect directory or over-broad ignore rule in CI. A discovered Markdown file with no recognized blocks is materially different: the requested supported input was read and completely checked, so `diagramCount: 0`, no Findings, and exit `0` are truthful.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Keep configuration and discovery failures atomic, but treat an individual file-read failure after successful discovery as a soft input error. Attempt every discovered file in sorted order, validate all successfully read snapshots, report each failed path on stderr, and include bounded structured read errors plus `complete: false` in JSON-v2. Do not represent unreadable files as validation Findings.
  Rationale: This matches ripgrep's useful best-effort behavior without pretending that an unreadable file passed. Discovery has already established the intended set, so the CLI can return diagnostics for readable files while the exit class and JSON completeness fields tell automation that the run was incomplete.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Determine the final collection exit code using strict precedence `3 > 2 > 1 > 0`: any error-severity system Finding yields `3`; otherwise any input error yields `2`; otherwise any error-severity validation Finding yields `1`; otherwise return `0`.
  Rationale: One process code can expose only one failure class. Parser infrastructure failure has the highest operational priority, incomplete input outranks a completed syntax rejection, and the emitted JSON/stderr retain every lower-priority detail rather than discarding it.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Explicit supported files bypass ignore rules, while files found through a directory or no-argument default discovery honor nested `.gitignore`, the config `ignore` list, and hard exclusions for `.git`, `node_modules`, and `dist`.
  Rationale: A user who names a file has made an unambiguous request. Repository scanning should respect normal project exclusions and must not validate dependency or generated trees. Discovery still accepts only case-insensitive `.mmd`, `.mermaid`, and `.md`; `.markdown` and `.mdx` remain outside Stage 2.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Introduce JSON schema version 2 as one deterministic collection envelope and make `--format json` emit it for both one-file and repository invocations after Stage 2.
  Rationale: JSON-v1 represents exactly one document and cannot describe a repository result or summary. Using one v2 shape regardless of file count is easier for current callers than switching schemas based on input cardinality. Because the package is private and pre-release, Stage 2 replaces v1 directly: retain the v1 reference only as implementation history, and add no selector, fallback, compatibility shim, migration, deprecation period, or stability promise.
  Date/Author: 2026-07-19 / User and Codex

- Decision: Keep package version `0.1.0` through Stage 2.
  Rationale: `DRAFT-PLAN.md` defines the next internal release cut, `v0.2`, only after Stage 3 proves repository-aware rules and fixes. JSON schema version and package version are independent. The package remains private and unexported, so Stage 2 does not need release-version or backward-compatibility machinery.
  Date/Author: 2026-07-19 / User and Codex

## Outcomes & Retrospective

Stage 2 is complete. The built CLI accepts files, directories, or no paths; discovers `.mmd`, `.mermaid`, and `.md`; honors nested `.gitignore`, config-root ignores, dot directories, and explicit-file precedence; validates exact-lowercase CommonMark Mermaid fences through the existing official worker; and returns host-document UTF-16 Findings. JSON-v2 is the sole current structured collection output and exposes completeness plus bounded read failures.

After the 2026-07-20 source-map hardening, the current gate is 20 test files and 120 tests on both Node 22.20.0 and Node 24.18.0. The independent compatibility evidence remains 4 files and 16 tests, 27 fixtures and 108 observations, the same two known noncanonical `pie-invalid-header` mismatches, 5/5 coordinate expectations, and 12/12 complete Merman fact summaries. Direct dependencies remain exact; the two Stage 2 packages are runtime-only in their owning adapters, while mermaid-lint and Merman remain development-only. No MDX, Stage 3 rule/fix work, later delivery adapter, package export, or visual dependency was added.

## Context and Orientation

The repository is one private TypeScript ESM package. pnpm 10.30.1 manages dependencies, `.nvmrc` pins Node 24.18.0, and the accepted engine range also covers the locally verified Node 22.20.0. `package.json` has no `exports` or `types` field. Through Stage 5, source `index.ts` files are repository-internal module seams rather than supported npm entry points.

`DRAFT-PLAN.md` owns product scope and stage exit criteria. It says Stage 2 adds file discovery, ignore handling, config loading, `.md` Mermaid-fence extraction, segment-level mapping, and tests for multiple blocks, indentation, lists, blockquotes, frontmatter, CRLF, Unicode, and unclosed fences. It explicitly defers MDX until real fixtures exist. `ARCHITECTURE.md` owns module placement: Markdown extraction and mapping belong inside `src/validation/`; discovery, ignore processing, config-file discovery, and filesystem reads belong to `src/cli/`.

The current `src/validation/index.ts` exports one asynchronous `validateDocument()` operation and the project-owned `DocumentSnapshot`, `Finding`, and `ValidationResult` types. A Document Snapshot is immutable text plus URI and language. Stage 1 accepts only `languageId: "mermaid"`. A Finding is a stable diagnostic. Its optional `span` uses zero-based UTF-16 code-unit offsets and is half-open: `startOffset` is included and `endOffset` is excluded. JavaScript string indices already count UTF-16 code units, so a character outside the Basic Multilingual Plane, such as an emoji, occupies two offsets. A Validation Result is valid exactly when it has no error-severity Finding.

`src/validation/validate-document.ts` currently sends one whole standalone source string to the internal Canonical Syntax module, then maps the resulting Syntax Outcome to zero or one Finding. `src/validation/canonical-syntax/` owns the exact official Mermaid/JSDOM profile, serialized worker protocol, timeouts, crashes, and raw Mermaid-error normalization. Nothing in Stage 2 changes canonical syntax truth or imports an independent parser into that path.

`src/cli/main.ts` is currently a one-file delivery adapter. It parses one required path, accepts only `.mmd` and `.mermaid`, reads UTF-8, creates a Mermaid Document Snapshot, calls `validateDocument()`, writes terminal or JSON-v1 output, and returns exit code `0`, `1`, `2`, or `3`. Exit `0` means no error Finding; `1` means validation completed with a Mermaid or future rule error; `2` means command/config/discovery/file input prevented creation of a complete validation collection; and `3` means at least one system Finding made validation incomplete. Stage 2 keeps those meanings across all documents and resolves mixed outcomes with `3 > 2 > 1 > 0` precedence.

`src/cli/terminal-output.ts` derives one-based line and column from a host UTF-16 offset. It already works for Markdown once Findings carry parent-document spans. `src/cli/json-v1-output.ts` and `docs/reference/json-output-v1.md` describe a single-document envelope. Stage 2 replaces the CLI implementation with `json-v2-output.ts`, retains the v1 reference as historical documentation, and adds `docs/reference/json-output-v2.md`.

`src/compatibility/` and `tests/compatibility/` are Stage 0 Compatibility Evidence. They may observe `src/validation/index.ts`, but product code must never import their contracts. Their 27 fixtures and 108 observations are a regression gate, not implementation building blocks. `@mermaid-lint/core` and Merman remain development dependencies used there.

The new internal Markdown module uses these terms:

- A host document is the entire `.md` Document Snapshot supplied by a caller.
- An embedded diagram is the Mermaid source value of one CommonMark fenced code block whose parsed language is exactly lowercase `mermaid`. Both backtick and tilde fences count; optional trailing fence metadata is allowed by CommonMark. Indented code blocks and other languages do not count.
- A copied segment is one contiguous slice of embedded source that is byte-for-code-unit identical to a contiguous host slice. Segments are ordered and non-overlapping. Removed list indentation and blockquote prefixes are gaps between host segments, not invented embedded text.
- An offset map projects an embedded half-open UTF-16 span through those copied segments into one half-open host span. At a gap-producing segment join, non-empty starts are right-biased, non-empty ends are left-biased, and empty spans are right-biased; embedded EOF maps to the final host body boundary.
- A host body span starts at the first mapped body boundary and ends at the final mapped body boundary. It is used as an approximate location only when Mermaid supplies no narrower span.
- Round-trip evidence means that concatenating every host slice named by the segments exactly reconstructs the extracted source, including LF or CRLF line endings.

The architecture rules relevant to this plan are mandatory. `src/cli/**` may import only other CLI files and `src/validation/index.ts` from product code. Root `src/validation/*.ts` files may import `src/validation/markdown/index.ts` and `src/validation/canonical-syntax/index.ts`, but must not deep-import their implementation files. `src/validation/markdown/**` may import only files in its own subtree plus the exact CommonMark dependency in its adapter file; it must not call Canonical Syntax itself. Diagram Validation must not import CLI, Compatibility Evidence, filesystem modules, globby, or configuration code. CLI must not import Mermaid, JSDOM, Canonical Syntax internals, or CommonMark nodes. Later `src/rules/`, `src/lsp/`, `src/facts/`, and `src/mcp/` modules remain absent. Visual modules and dependencies remain prohibited.

The current clean baseline is commit `cf7d827`. The full Stage 1 gate is 15 passing test files and 67 passing tests, and the focused compatibility gate is 4 passing files and 16 passing tests. An implementation agent must record new final counts rather than preserving these numbers artificially.

## Plan of Work

### Milestone 1: Establish the Stage 2 dependency and architecture boundary

Begin by turning the accepted Stage 2 architecture into tests before product behavior changes. Add two exact runtime dependencies with pnpm: `mdast-util-from-markdown@2.0.3` and `globby@16.2.2`. Keep all existing direct dependency versions exact. Keep `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` in `devDependencies`; do not add lilconfig, Zod, `remark-gfm`, a visual package, a Git subprocess package, or any Stage 3–6 dependency.

Rename `tests/architecture/stage1-import-boundaries.test.ts` to `tests/architecture/module-import-boundaries.test.ts` and generalize its zone assertions for Stage 2. Root validation files may enter `src/validation/markdown/` only through `markdown/index.ts`. Files inside that subtree stay inside it. Only `src/validation/markdown/extract-markdown.ts` may import `mdast-util-from-markdown`, and only `src/cli/discovery.ts` may import `globby`. Preserve all Stage 1 rules for Commander, Mermaid, JSDOM, Canonical Syntax, Compatibility Evidence, deep imports, and cycles. Add focused negative cases proving that CLI cannot deep-import Markdown internals, Markdown cannot import CLI or Canonical Syntax, and Diagram Validation cannot import filesystem/discovery/config packages.

Update `tests/architecture/engine-versions.test.ts` or add a focused dependency-placement test that proves all direct versions are exact, the two Stage 2 libraries are runtime dependencies, lilconfig and Zod are absent, the two comparison engines remain development-only, and no visual or later-stage dependency appears. `DRAFT-PLAN.md` now records the accepted dependency plan, but do not change its Stage 2 status or claim Stage 2 is active-complete yet.

Create red tests with their final intended paths before implementing behavior: `tests/internal/validation/markdown/extract-markdown.test.ts`, `tests/internal/validation/markdown/offset-map.test.ts`, expanded `tests/contract/validation/validate-document.test.ts`, `tests/unit/cli/config.test.ts`, `tests/unit/cli/discovery.test.ts`, `tests/unit/cli/reporters.test.ts`, and expanded `tests/integration/cli/cli.test.ts`. Add compact Markdown fixtures under `tests/fixtures/markdown/` only when a real file improves integration clarity; construct CRLF and unusual Unicode strings inside tests so repository newline normalization cannot alter them.

This milestone is complete when the lockfile records the exact intended runtime graph, architecture tests describe all new ownership rules, and the new behavior tests fail because the Stage 2 interfaces do not exist rather than because of setup or type errors unrelated to the feature.

### Milestone 2: Implement CommonMark extraction and segment-level host mapping

Create `src/validation/markdown/contracts.ts`, `extract-markdown.ts`, `offset-map.ts`, and `index.ts`. This is one internal deep module. `index.ts` re-exports only the project-owned `extractMarkdownDiagrams()` result and the span-projection operation needed by root Diagram Validation. Do not export CommonMark nodes, mdast types, syntax-tree positions, or dependency errors.

In `contracts.ts`, define immutable project types for a copied segment, private `EmbeddedSpan` and `HostSpan` coordinate spaces, an extracted diagram, and a bounded extraction failure. Every copied segment has embedded and host start/end offsets; each interval is half-open, lengths are equal, embedded segments are contiguous from zero through the extracted source length, and host segments are increasing without overlap. An extracted diagram contains its source, ordered segments, and host body span. It does not carry a child URI because all Findings belong to the host Document Snapshot. The Markdown subtree does not import the public `TextSpan` from its parent; root Diagram Validation converts the structurally identical projected host span while assembling a Finding.

In `extract-markdown.ts`, call `fromMarkdown(hostText)` from the exact dependency and walk the returned tree locally. Select fenced code nodes whose parsed `lang` is exactly `mermaid`; the parser may supply trailing metadata separately, which does not change selection. Do not add an independent YAML/TOML frontmatter scanner or filter nodes based on guessed metadata boundaries. A fence inside metadata that CommonMark recognizes is extracted in Stage 2; this limitation is documented rather than hidden behind incomplete parsing.

For each selected code node, use its source offsets, parsed `value`, and physical host lines to build copied segments. The first body line is the physical line after the opener. For each extracted value line, including its original LF or CRLF terminator when present, verify that the value slice is a suffix of the corresponding host line after CommonMark container-prefix removal. Record the matching host slice as one copied segment. Empty body lines map their line ending after any removed prefix. Do not search globally for repeated text, normalize line endings, trim trailing whitespace, invent closing fences, or use the opening-fence line as a universal offset.

Validate the finished map before returning it. Concatenating the host slice for every segment must equal the code node value exactly. The embedded ranges must be contiguous, segment lengths must match, and host ranges must be monotonic and contained by the host document. A zero-length body is allowed and maps to the body boundary after the opener. If the parser throws, omits required positions, or a body line cannot be aligned exactly, return one bounded project-owned extraction failure without a stack, raw node, absolute temporary path, or dependency payload.

In `offset-map.ts`, implement projection of an embedded half-open span. Locate the segment containing each boundary and preserve its relative UTF-16 distance. A span entirely within copied content maps exactly. At an embedded boundary shared by two segments, map a non-empty span start to the next segment's host start and map its end to the previous segment's host end. Map both boundaries of a zero-length span at the join to the next segment's host start. Map the embedded source-length boundary to the final host body boundary, including zero-length bodies. A multi-line span may cover host prefix gaps between the projected start and end, which is acceptable because the result is still the smallest continuous host interval containing the copied source range. Reject reversed, out-of-bounds, or internally inconsistent spans rather than clamping them silently.

The extraction tests must cover multiple Mermaid blocks; backtick and tilde fences; optional metadata; exact lowercase `mermaid`; ignored `Mermaid`, `MERMAID`, and other casing; ordinary indentation; a list; nested blockquotes; list-plus-blockquote nesting; ordinary YAML-shaped and TOML-shaped frontmatter followed by a real block; LF; CRLF; ASCII; BMP Unicode; an astral character; combining marks; empty blocks; an unclosed fence whose body extends to EOF without a structural Finding; longer closing markers; non-Mermaid code blocks; and Markdown with no Mermaid block. Do not add a test that implies frontmatter is opaque. The round-trip assertion must run for every extracted diagram. The offset tests must prove projections at the first character, an indented character, both sides of CRLF, an astral UTF-16 boundary, a whole line, an empty line, the last character, and EOF. At a segment join, assert right-biased starts, left-biased ends, right-biased zero-length spans, and rejection of reversed or out-of-bounds spans.

This milestone is complete when all extraction and map tests pass without invoking Mermaid, filesystem discovery, or CLI code, and when malformed internal alignment produces a bounded failure rather than a guessed span.

### Milestone 3: Extend Diagram Validation to host documents

Update `src/validation/document.ts` so `DocumentSnapshot.languageId` is `"mermaid" | "markdown"`. Do not add `mdx`. Keep `ValidateOptions.mode` canonical-only and keep configuration discovery out of this module.

Update `src/validation/findings.ts` to add `system/markdown-extraction-failed` to the built-in code union and add `diagramCount: number` to `ValidationResult`. The count is `1` for every standalone Mermaid snapshot and the number of extracted Mermaid blocks for Markdown, including blocks that later fail syntax validation. A Markdown document with no Mermaid block has count `0`, is valid, and has no Findings.

Refactor `src/validation/validate-document.ts` so mapping a Syntax Outcome to a diagram-relative Finding is separate from assembling a host Validation Result. Standalone Mermaid must retain its exact Stage 1 behavior and spans. For Markdown, call `extractMarkdownDiagrams()`, then validate each extracted source through the existing `checkCanonicalSyntax()` seam in document order. Do not create one worker per block and do not call the public `validateDocument()` recursively. The existing worker host already serializes requests and recovers after infrastructure failures.

When a Syntax Outcome has an embedded span, project it through the offset map and retain the outcome's precision. When it has no embedded span, use the extracted diagram's host body span and `locationPrecision: "approximate"`. Keep the host URI and optional host version on the one returned Validation Result. Preserve finding order by block order. Continue after every normal syntax error, unsupported-type outcome, or `system/parser-*` outcome so all later blocks are attempted. A system outcome produces one Finding for its current block; do not retry that block or add a consecutive-failure cutoff. Honor `AbortSignal` before extraction, between blocks, and during each canonical request; cancellation remains a rejected `AbortError`, never a Finding.

Prevalidate every extracted map before making canonical requests. If parsing, extraction, or that prevalidation fails, make no canonical request for the host. If projecting a later Mermaid outcome nevertheless fails, discard all accumulated Findings for the host and stop making subsequent block requests. In either case, return only one `system/markdown-extraction-failed` Finding with a bounded message, a whole-host span `{ startOffset: 0, endOffset: document.text.length }`, `locationPrecision: "document"`, `diagramCount: 0`, and `valid: false`. This failure is document-local: the CLI continues later repository files. No raw CommonMark data may reach the Finding or JSON.

Expand validation contract tests to compare standalone and embedded canonical verdicts for valid and invalid fixtures across Flowchart, Sequence, Pie, Class, and State. Compare `valid`, stable finding code, source, severity, diagram type, and engine; spans and document URIs intentionally differ. Add Markdown tests for multiple blocks, zero blocks, one officially valid unsupported Gantt block, a syntax error whose Mermaid location is mapped through a blockquote/list prefix, a locationless Pie syntax error mapped to the block body, a parser-system outcome followed by a successful later block through a fresh worker, repeated parser-system outcomes that still attempt every block, an injected extraction/map-prevalidation failure that prevents all canonical calls for that host, an injected outcome-projection failure that discards earlier Findings and prevents later block calls, proof that either failure does not stop the next repository document, document version preservation, deterministic finding order, and cancellation. Every non-cancellation Markdown Finding must have a host-bounded span.

This milestone is complete when the same public in-memory operation validates both supported language IDs, every embedded Finding points into its original host text, standalone behavior remains unchanged, and no CLI or filesystem dependency enters Diagram Validation.

### Milestone 4: Add config, discovery, repository CLI behavior, and JSON v2

Create `src/cli/config.ts` with project-owned `loadCliConfig()` behavior. Use Node filesystem and path APIs to search upward from an injected/current working directory to the filesystem root for the nearest `mermaid-validator.config.json`. An explicit `--config <path>` loads exactly that file and does not continue searching. Resolve the config root to the directory containing the found config, or to the working directory when none exists. Parse with `JSON.parse()` and validate through a small project-owned check that accepts only an optional `ignore` array of non-empty strings. Every `ignore` value must be a forward-slash relative glob whose only pattern operators are `*`, `?`, and `**`. Reject a leading `!`, an absolute root, any `..` path segment, backslashes, braces, square brackets, or parentheses. Missing explicit config, parse errors, shape errors, unknown keys, and invalid ignore patterns are CLI input failures with one concise path-aware message.

Create `src/cli/discovery.ts`. Its public-within-CLI operation accepts the working directory, config root, optional explicit paths, and config ignores, and returns sorted unique absolute supported file paths. With no explicit paths, use the fixed default patterns `**/*.mmd`, `**/*.mermaid`, and `**/*.md`, matched case-insensitively and rooted at the config directory. Explicit paths are resolved from the working directory and may lie outside the config root. An explicit supported file is included even when ignored. An explicit directory is recursively discovered. A missing path, non-file/non-directory path, or explicit unsupported extension is an input failure rather than a silent omission.

Directory and no-argument default discovery use globby with `gitignore: true`, `dot: true`, `onlyFiles: true`, `unique: true`, `absolute: true`, `followSymbolicLinks: false`, and case-insensitive extension matching. This includes dot directories such as `.github`, while hard ignores still exclude `.git`, `node_modules`, and `dist`. Apply config `ignore` patterns relative to the config root only to discovered paths inside that root. An explicit directory outside the root uses that directory as its scan base, honors nested `.gitignore` plus hard exclusions, and does not receive the current config's ignore patterns. Nested `.gitignore` files must work without requiring the `git` executable. Filter the final list by the supported extension set as a defense in depth. If discovery returns no supported file, report a concise exit-2 input failure.

Refactor `src/cli/main.ts` around injected config, discovery, read, validation, and I/O dependencies so unit tests remain process-free. Change the argument from one required `<file>` to optional variadic `[paths...]` and add `--config <path>`. Preserve `--format <terminal|json>`, `--version`, help, Commander exit overrides, and the Stage 1 four exit-code meanings. Map `.mmd` and `.mermaid` to `languageId: "mermaid"` and `.md` to `languageId: "markdown"`, case-insensitively.

Resolve config and discovery first. If either fails, write one concise stderr message, write no validation result, and return `2` because the intended file set is unknown. After successful non-empty discovery, attempt to read every sorted file as UTF-8 before beginning validation. Collect a bounded project-owned `input/read-failed` error for each failed path, continue reading, and then validate every successful snapshot sequentially in sorted path order. Report each read error on stderr in deterministic path order. Terminal mode may format each successful result with the existing `formatTerminal()` and concatenate non-empty strings; one explicit standalone invalid file must retain the exact Stage 1 line format. JSON mode emits the partial successful documents together with `complete: false` and the structured input errors, including when no discovered file could be read. Determine the final collection exit code with strict precedence: any error-severity system Finding returns `3`; otherwise any collected input error returns `2`; otherwise any error-severity validation Finding returns `1`; otherwise return `0`.

Replace `src/cli/json-v1-output.ts` with `src/cli/json-v2-output.ts` and add `docs/reference/json-output-v2.md`. `--format json` always writes one trailing-newline-terminated object with stable key order:

    {
      "schemaVersion": 2,
      "tool": {
        "name": "mermaid-diagram-validator",
        "version": "0.1.0"
      },
      "complete": true,
      "valid": false,
      "inputErrors": [],
      "documents": [
        {
          "uri": "file:///workspace/docs/guide.md",
          "languageId": "markdown",
          "diagramCount": 2,
          "valid": false,
          "findings": [
            {
              "code": "mermaid/syntax-error",
              "severity": "error",
              "message": "Mermaid syntax error: <bounded detail>",
              "source": "mermaid",
              "span": { "startOffset": 84, "endOffset": 85 },
              "locationPrecision": "approximate",
              "diagramType": "flowchart",
              "engine": { "name": "mermaid", "version": "11.16.0" }
            }
          ]
        }
      ],
      "summary": {
        "documents": 1,
        "diagrams": 2,
        "findings": 1,
        "errors": 1,
        "warnings": 0,
        "infos": 0,
        "inputErrors": 0
      }
    }

Reuse the existing stable Finding projection: omit optional fields rather than writing `null`, retain host spans, and never expose raw parser or extractor data. Document order is the sorted discovery order and finding order is the validation order. Each `inputErrors` entry contains the stable code `input/read-failed`, the normalized absolute path, and the bounded message `Unable to read input file`; it never exposes a raw Node error. `complete` is true exactly when `inputErrors` is empty. Top-level `valid` is true exactly when the collection is complete and all emitted documents are valid. Summary finding and diagram counts are derived from emitted documents; `summary.inputErrors` equals the structured input-error count.

Update reporter unit tests for JSON-v2 single and multi-document results, completeness, structured input errors, summary counts, deterministic serialization, host spans, omitted fields, and raw-data exclusion. Expand CLI unit tests for all `3 > 2 > 1 > 0` exit-precedence combinations, fatal config/discovery failures before output, one and multiple injected read failures alongside successful validation, all reads failing after successful discovery, deterministic stderr ordering, explicit-file ignore bypass, Markdown language selection, and warning-only success. Expand built CLI integration tests for no-argument repository discovery, a directory, mixed standalone/Markdown inputs, nested `.gitignore`, `.github` traversal, accepted `*`, `?`, and `**` config ignores, rejection of negation, absolute, parent-traversal, backslash, brace, character-class, and extglob syntax, rejection of a removed `files` key, files explicitly named beneath config and hard exclusions, explicit directories that still honor those exclusions, explicit files and directories outside the config root, proof that root-relative config ignores do not affect the outside directory, multiple blocks, successful zero-block Markdown, uppercase supported extensions, invalid config, exit-2 discovery with no supported files, JSON-v2, and unchanged version/help behavior.

This milestone is complete when one built command validates a repository without shelling out, terminal paths and coordinates refer to host files, JSON is one parseable v2 collection for any input count, ignored files behave as documented, and all four exit classes remain deterministic.

### Milestone 5: Document and close Stage 2 without entering Stage 3

Update `README.md` to explain file and directory invocation, no-argument discovery, supported extensions, exact-lowercase `mermaid` Markdown fences, the lack of special frontmatter parsing, `.gitignore`, the optional `mermaid-validator.config.json` file and its `ignore` field, limited best-effort file reads, terminal examples, JSON-v2 completeness/input errors, exit codes, Node/pnpm requirements, and the private/no-programmatic-export status. Say explicitly that differently cased fence languages are ignored, a CommonMark-recognized fence inside frontmatter may be extracted, and MDX, `.markdown`, rules, fixes, LSP, Semantic Facts, MCP, installed-package support, and visual validation are not implemented.

Add `docs/reference/configuration.md` with the nearest-upward `mermaid-validator.config.json` search, explicit-override precedence, the basic exclusion-only forward-slash `ignore` subset using literals plus `*`, `?`, and `**`, rejection of negation/absolute/parent-traversal/backslash/brace/character-class/extglob syntax, fixed discovery defaults, config-root boundaries, outside-root explicit path behavior, explicit-file ignore behavior, examples, and input-error semantics. Add `docs/reference/json-output-v2.md` with every envelope, completeness, structured input-error, document, summary, and Finding field; UTF-16/half-open span semantics; stable Stage 2 codes; and examples for a valid repository, partial collection after a read failure, Markdown syntax error, unsupported block, and system failure. State that this private pre-release schema has no backward-compatibility promise. Keep `docs/reference/json-output-v1.md` only as historical evidence and add a notice that the Stage 2 CLI emits only v2.

Update `ARCHITECTURE.md` to show the active Stage 2 `src/validation/markdown/` and CLI config/discovery files, extend the runtime flow and import/dependency ownership tables, and rename Stage 1-only wording where necessary. These edits implement an already accepted direction and do not require an ADR. If implementation evidence requires moving filesystem discovery into Diagram Validation, exposing CommonMark nodes, reversing an edge, adding a new canonical engine, or splitting the package, stop and write an ADR before proceeding.

Only after all behavior and gates pass, update `DRAFT-PLAN.md`: mark Stage 2 complete with the actual date and Node 22/24 evidence; change the top status to Stages 0–2 complete and Stage 3 not started; record the exact Stage 2 dependency choices in the technology table; keep MDX deferred; and leave Stage 3 scope unchanged. Do not mark the `v0.2` release cut complete because that release also requires Stage 3.

Run the frozen-install, typecheck, build, hygiene, full test, and compatibility gates under Node 22.20.0 and Node 24.18.0. The compatibility gate must remain 27 fixtures and 108 observations with the same two known `pie-invalid-header` mismatches, 5/5 coordinate expectations, and 12/12 complete selected Merman fact summaries. Inspect `pnpm list --depth 0`, `package.json`, the lockfile, and the architecture test to prove that every direct version is exact, no visual or later-stage dependency entered, and `@mermaid-lint/core` plus Merman remain development-only.

Exercise the built CLI with the commands in `Concrete Steps`. Record actual test counts, the Node versions, dependency layout, repository/Markdown transcripts, and any implementation-time decisions in this plan. Complete `Outcomes & Retrospective` and append a revision note. Stop after Stage 2 is green; do not create `src/rules/` or begin the first custom rule.

## Concrete Steps

All commands run from `/Users/wangzhihao/Documents/playground/mermaid-diagram-validator`. `/Users/wangzhihao/.codex/RTK.md` requires the `rtk` prefix for every shell command. Use pnpm for all Node package operations. Use patch-based edits, preserve unrelated worktree changes, and do not commit unless the user separately asks.

Establish the starting state:

    cd /Users/wangzhihao/Documents/playground/mermaid-diagram-validator
    rtk git status --short --branch
    rtk node --version
    rtk pnpm --version
    rtk pnpm install --frozen-lockfile
    rtk pnpm check
    rtk pnpm compatibility

Expected baseline evidence is a clean `main` at `cf7d827`, Node 22.20.0 or the `.nvmrc` Node 24.18.0, pnpm 10.30.1, a passing full Stage 1 gate, and the unchanged 27-fixture/108-observation compatibility summary.

Add the Stage 2 dependencies exactly:

    rtk pnpm add --save-exact mdast-util-from-markdown@2.0.3 globby@16.2.2
    rtk pnpm install --frozen-lockfile
    rtk pnpm list --depth 0

Inspect `package.json`. The new packages must be exact runtime dependencies. `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` must remain exact development dependencies. Do not add a separate `fast-glob`, `ignore`, `remark-gfm`, YAML parser, visual dependency, or future adapter dependency unless real implementation evidence invalidates this plan and the decision is recorded first.

Run the initial focused red tests, then keep them green milestone by milestone:

    rtk pnpm exec vitest run tests/internal/validation/markdown
    rtk pnpm exec vitest run tests/contract/validation
    rtk pnpm exec vitest run tests/unit/cli/config.test.ts tests/unit/cli/discovery.test.ts
    rtk pnpm exec vitest run tests/unit/cli/reporters.test.ts tests/unit/cli/main.test.ts
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/architecture

After implementing extraction and Diagram Validation, run:

    rtk pnpm typecheck
    rtk pnpm build
    rtk pnpm exec vitest run tests/internal/validation/markdown tests/internal/validation
    rtk pnpm exec vitest run tests/contract/validation

The internal tests must prove exact source reconstruction and offset projection. The contract tests must prove equivalent standalone/embedded canonical verdicts for all five families and host-bounded Markdown Findings.

After implementing config, discovery, and collection reporting, run:

    rtk pnpm build
    rtk pnpm exec vitest run tests/unit/cli
    rtk pnpm exec vitest run tests/integration/cli
    rtk pnpm exec vitest run tests/architecture

Use the checked-in Stage 2 integration fixtures created by the implementation to exercise observable behavior. The final fixture paths must be recorded here if they differ from these planned names:

    rtk node dist/cli/main.js tests/fixtures/markdown/valid-repository
    rtk node dist/cli/main.js tests/fixtures/markdown/embedded-invalid.md
    rtk node dist/cli/main.js --format json tests/fixtures/markdown/embedded-invalid.md
    rtk node dist/cli/main.js --format json tests/fixtures/markdown/mixed-repository
    rtk node dist/cli/main.js --config tests/fixtures/markdown/config/mermaid-validator.config.json

The valid repository invocation has empty stdout/stderr and status `0`. The invalid Markdown invocation prints a compiler-style line naming `embedded-invalid.md`, with line and column in that host file, writes no stderr, and returns `1`. Both JSON invocations write exactly one parseable object with `schemaVersion: 2`, host URIs, correct diagram and summary counts, no stderr, and status derived from the collection. The config invocation proves default discovery and ignore behavior from the config root.

Exercise zero-block Markdown, input errors, and unchanged standalone behavior:

    rtk node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
    rtk node dist/cli/main.js fixtures/compatibility/flowchart/invalid-edge.mmd
    rtk node dist/cli/main.js README.md
    rtk node dist/cli/main.js missing-path
    rtk node dist/cli/main.js package.json
    rtk node dist/cli/main.js --config missing-config.json
    rtk node dist/cli/main.js --version

The valid standalone invocation remains silent with status `0`. The invalid standalone invocation retains the Stage 1 terminal line and status `1`. The current zero-block `README.md` invocation is also silent with status `0`; JSON mode for the same file would contain one valid Markdown document with `diagramCount: 0`. Missing/unsupported/config failures write no validation result, use stderr, and return `2`. `--version` remains `0.1.0`, returns `0`, and does not start the parser worker or perform discovery.

Run the final gate under Node 22.20.0:

    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" node --version
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm install --frozen-lockfile
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm check
    rtk env PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH" pnpm compatibility

Run the same gate under Node 24.18.0:

    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" node --version
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm install --frozen-lockfile
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm check
    rtk env PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PATH" pnpm compatibility

Finish with evidence and hygiene inspection:

    rtk pnpm list --depth 0
    rtk git diff --check
    rtk git status --short --branch
    rtk git diff -- package.json pnpm-lock.yaml ARCHITECTURE.md DRAFT-PLAN.md README.md docs/reference src tests

Do not commit as part of this plan unless the user separately requests it.

## Validation and Acceptance

Stage 2 is accepted only when behavior, boundaries, and regression evidence all pass.

For Markdown behavior, a Document Snapshot with `languageId: "markdown"` must validate every exact-lowercase `mermaid` backtick or tilde fenced block returned by the CommonMark parser, in source order. Other casing is ignored. Lists, nested blockquotes, ordinary indentation, optional fence metadata, ordinary frontmatter before a real block, LF, CRLF, Unicode, empty bodies, multiple bodies, and EOF-closed fences must not crash or drift. An unclosed fence validates its body through EOF and does not itself create a Finding. Stage 2 does not treat frontmatter as opaque, so a CommonMark-recognized fence inside metadata may be extracted. A parser-system failure records a Finding for its current block and must not prevent later blocks from being attempted; Stage 2 neither retries the failed block nor stops after repeated system failures. Markdown with no recognized Mermaid block is valid with `diagramCount: 0`. MDX and `.markdown` remain undiscovered and unsupported.

For source mapping, every Markdown Finding, including unsupported diagram types, locationless Mermaid syntax failures, and injected system failures, must contain a span bounded by the host text. Where Mermaid supplies a diagram-relative coordinate, projecting the resulting span must name the expected host character in list, blockquote, CRLF, and Unicode cases. Segment-join projection must use right-biased non-empty starts, left-biased non-empty ends, right-biased empty spans, and the final body boundary for embedded EOF; invalid spans must fail rather than be clamped. Where Mermaid supplies no span, the Finding must cover the responsible block body and be approximate. Concatenating all copied host segments must reproduce every extracted diagram exactly.

For canonical equivalence, embedding each representative five-family fixture in Markdown must preserve the standalone `valid` value and stable Finding classification. Independent CommonMark parsing may decide what source belongs to a fence, but it must never decide whether Mermaid syntax is valid. Official `mermaid@11.16.0` through the existing serialized worker remains the only verdict.

For repository input, zero CLI paths must discover from the resolved config root; a directory path must recursively discover supported files; and an explicit supported file must validate even if ignored. Config-driven discovery and ignores must not escape the config root, but explicit user paths may be outside it. An outside-root explicit directory honors its own nested `.gitignore` and hard exclusions without receiving root-relative config ignores. Directory/default discovery must honor nested `.gitignore`, root-bounded config ignores where applicable, hard exclusions, dot directories other than those hard-excluded, case-insensitive supported extensions, stable sorting, and duplicate removal. Config ignores must accept only literals plus `/`, `*`, `?`, and `**`; negation, absolute roots, parent traversal, backslashes, braces, character classes, and extglobs must be rejected. Discovery must not require Git. A missing path, unsupported explicit file, invalid config, or empty discovery result must return `2` with no terminal or JSON validation collection. After successful discovery, unreadable files must be reported as sorted bounded input errors while every readable file is validated; JSON must set `complete: false`, set `valid: false`, and contain both the partial documents and structured errors. An otherwise valid collection containing one or more Markdown documents but zero extracted diagrams must return `0` with those zero-count documents represented in JSON.

For output, terminal mode must retain the Stage 1 one-file line format and show host Markdown coordinates. JSON mode must always emit one deterministic schema-v2 object after successful discovery, with correct completeness, input errors, document order, host URIs, language IDs, diagram counts, Findings, global validity, and summary counts. Fatal configuration/discovery failures remain stderr-only exit `2`; successfully discovered but unreadable files produce a partial JSON collection rather than suppressing readable-file results. Exit `3` has precedence if any document has an error-severity system Finding; otherwise any input error yields `2`; otherwise any error-severity validation Finding yields `1`; otherwise the collection yields `0`.

For architecture, CLI imports Diagram Validation only through `src/validation/index.ts`; root validation enters Markdown and Canonical Syntax only through their `index.ts` seams; Markdown owns CommonMark extraction and mapping but not filesystem/config/discovery; CLI owns globby and project-owned Node configuration handling but not Mermaid or mdast nodes; Compatibility Evidence remains one-way; all direct versions are exact; lilconfig and Zod are absent; no later-stage or visual module/dependency exists; and the package remains private with no declarations or `exports` field.

For regression safety, `pnpm check` and `pnpm compatibility` must pass on both Node 22.20.0 and Node 24.18.0. Compatibility Evidence must remain 27 fixtures/108 observations with no snapshot drift beyond an intentionally reviewed product-observation change. The final plan must contain actual counts and short observable transcripts.

## Idempotence and Recovery

All pnpm operations are repeatable. Add dependencies once with the exact `pnpm add --save-exact` command, then use `pnpm install --frozen-lockfile`. Generated `dist/` output may be removed and rebuilt; never edit it by hand. Test fixtures and configuration files are additive and should use deterministic repository-relative content.

Config and discovery tests must inject or create isolated temporary roots and remove them in `finally`/test cleanup. Do not depend on the developer's global Git config, home directory, or repository-wide untracked files. The CommonMark probe under `/tmp/mermaid-validator-stage2-probe` is planning evidence only and is not a product dependency or required test location.

If a new Markdown case fails segment alignment, preserve the input as a focused fixture, keep the bounded `system/markdown-extraction-failed` behavior, and refine the local adapter. Do not fall back to `openingLine + relativeLine`, normalize the host document, or expose raw CommonMark nodes. Re-run the round-trip and host-span suites before continuing.

If one canonical worker request fails, record its system Finding and continue every later block. The existing worker host must discard/restart according to Stage 1 policy; do not retry the failed block, stop after repeated failures, or duplicate restart logic in Markdown extraction or CLI. If cancellation occurs, propagate `AbortError` and allow the established worker-host cleanup path to run.

If globby or mdast behavior differs on Node 22 and 24, first minimize the case behind the owning local adapter and its test. Change a dependency pin only with recorded evidence, a refreshed frozen lockfile, and both runtime gates. Do not import an upstream type directly through the validation or CLI module interface as a workaround.

If implementation requires a load-bearing architecture change, stop before claiming progress beyond the affected milestone. Update `ARCHITECTURE.md`, add an ADR explaining the evidence and new direction, revise this plan across all sections, and only then continue. Filename refinements within the accepted ownership do not require an ADR but must be reflected in this plan.

Preserve unrelated user changes. The starting worktree is clean, but if unrelated changes appear, keep them out of Stage 2 diffs and do not reset them. Do not commit unless explicitly asked.

## Artifacts and Notes

The starting repository evidence is:

    $ rtk git status --short --branch
    ## main...origin/main

    $ rtk git log -1 --oneline
    cf7d827 test: enforce stage 1 validation boundaries

    $ rtk node --version
    v22.20.0

    $ rtk pnpm --version
    10.30.1

The planning-time compatibility evidence is:

    Compatibility summary: 27 fixtures, 108 observations
    Verdict mismatches: mermaid-lint-official 0; mermaid-lint-aggregate 1 [pie-invalid-header]; merman 1 [pie-invalid-header]
    Official diagnostics: approximate locations 9/15; document-only 6/15; coordinate expectations 5/5
    Merman facts: complete 12/12; partial 0; unavailable 0
    Test Files  4 passed (4)
    Tests       16 passed (16)

The external CommonMark probe used only an isolated `/tmp` directory. Representative observations were:

    list value:       "flowchart TD\n  A-->B"
    blockquote value: "flowchart TD\n  A-->B"
    CRLF value:       "flowchart TD\r\n  A-->B"
    unclosed value:   "flowchart TD\n  A-->B" with end offset at EOF
    frontmatter:      an indented fence can parse as code; Stage 2 deliberately adds no opaque-range filter

The accepted Stage 2 dependency pins observed while authoring are:

    mdast-util-from-markdown 2.0.3
    globby                  16.2.2

These are plan inputs, not evidence that the packages have been added to this repository. The implementation must record the final `pnpm list --depth 0` output and any pin change.

Final observable evidence:

    $ node dist/cli/main.js tests/fixtures/markdown/valid-repository
    # status 0; stdout and stderr empty

    $ node dist/cli/main.js tests/fixtures/markdown/embedded-invalid.md
    .../embedded-invalid.md:5:11: error mermaid/syntax-error: Mermaid syntax error: <bounded detail>
    # status 1; coordinate names the host Markdown line

    $ node dist/cli/main.js --format json tests/fixtures/markdown/mixed-repository
    # status 1; schemaVersion 2; complete true; 2 documents; 2 diagrams; 1 finding; 1 error

    $ node dist/cli/main.js --format json --config tests/fixtures/markdown/config/mermaid-validator.config.json
    # status 0; 1 configured document; 1 diagram; ignored draft absent

Final dependency evidence from `pnpm list --depth 0` shows exact runtime `globby@16.2.2` and `mdast-util-from-markdown@2.0.3`; exact development-only `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0`; no lilconfig, Zod, later-stage, or visual dependency. The architecture fitness test is now `tests/architecture/module-import-boundaries.test.ts` and enforces the Markdown and discovery adapter ownership.

Both Node 22.20.0 and Node 24.18.0 passed the original frozen-install evidence. After the 2026-07-20 source-map hardening, `pnpm check` passes on both runtimes with 20 files and 120 tests; each run includes the unchanged 4-file/16-test, 27-fixture/108-observation compatibility summary.

## Interfaces and Dependencies

At the end of Stage 2, `src/validation/document.ts` defines:

    export interface DocumentSnapshot {
      readonly uri: string;
      readonly languageId: "mermaid" | "markdown";
      readonly text: string;
      readonly version?: number;
    }

    export interface ValidateOptions {
      readonly mode?: "canonical";
      readonly signal?: AbortSignal;
    }

Do not add MDX or file paths to this contract. URI and in-memory text remain the source of truth for future unsaved-editor use.

`src/validation/findings.ts` retains the Stage 1 Finding shape and adds the extraction code plus diagram count:

    export type BuiltInFindingCode =
      | "mermaid/syntax-error"
      | "mermaid/unsupported-diagram-type"
      | "system/markdown-extraction-failed"
      | "system/parser-initialization-failed"
      | "system/parser-timeout"
      | "system/parser-runtime-failed"
      | "system/parser-crashed"
      | "system/parser-protocol-error";

    export interface ValidationResult {
      readonly documentUri: string;
      readonly documentVersion?: number;
      readonly diagramCount: number;
      readonly valid: boolean;
      readonly findings: readonly Finding[];
    }

`src/validation/index.ts` continues to export only Document Snapshot, Validate Options, Finding/Result types, and `validateDocument()`. It must not export Markdown contracts, offset maps, CommonMark types, Syntax Outcomes, worker controls, config, or discovery.

Inside `src/validation/markdown/contracts.ts`, use project-owned interfaces equivalent to:

    interface CopiedSegment {
      readonly embeddedStartOffset: number;
      readonly embeddedEndOffset: number;
      readonly hostStartOffset: number;
      readonly hostEndOffset: number;
    }

    interface EmbeddedSpan {
      readonly startOffset: number;
      readonly endOffset: number;
    }

    interface HostSpan {
      readonly startOffset: number;
      readonly endOffset: number;
    }

    interface ExtractedDiagram {
      readonly source: string;
      readonly segments: readonly CopiedSegment[];
      readonly hostBodySpan: HostSpan;
    }

    type MarkdownExtractionResult =
      | { readonly kind: "ok"; readonly diagrams: readonly ExtractedDiagram[] }
      | { readonly kind: "failure"; readonly message: string };

The exact private names may be refined, but the semantics and seam may not. `src/validation/markdown/index.ts` exposes internal operations equivalent to:

    export function extractMarkdownDiagrams(hostText: string): MarkdownExtractionResult;

    export function projectEmbeddedSpan(
      diagram: ExtractedDiagram,
      embeddedSpan: EmbeddedSpan,
    ): HostSpan | undefined;

These span types remain private to the Markdown subtree; their identical field shape permits root Diagram Validation to copy a returned `HostSpan` into the public `TextSpan` contract without reversing the import edge. An undefined projection indicates an invariant failure and becomes `system/markdown-extraction-failed`; callers do not clamp or guess.

`src/cli/config.ts` owns a strict data-only configuration contract equivalent to:

    interface Stage2CliConfig {
      readonly ignore?: readonly string[];
    }

    interface LoadedCliConfig {
      readonly rootDirectory: string;
      readonly filepath?: string;
      readonly config: Stage2CliConfig;
    }

    export async function loadCliConfig(options: {
      readonly cwd: string;
      readonly explicitPath?: string;
    }): Promise<LoadedCliConfig>;

Wrap filesystem, JSON parse, and shape-validation failures in one local error class or discriminated result that `runCli()` can turn into exit `2`. Do not expose raw `SyntaxError` values or an executable config module.

`src/cli/discovery.ts` owns a project input contract equivalent to:

    export async function discoverInputFiles(options: {
      readonly cwd: string;
      readonly configRoot: string;
      readonly explicitPaths: readonly string[];
      readonly ignore?: readonly string[];
    }): Promise<readonly string[]>;

It returns sorted unique absolute paths with only `.mmd`, `.mermaid`, or `.md` extensions. All globby options and path-normalization details remain private to this file.

Within `src/cli/`, define a private validation record that keeps each Document Snapshot next to its Validation Result so reporters can project language and source without rereading files:

    interface ValidatedDocument {
      readonly document: DocumentSnapshot;
      readonly result: ValidationResult;
    }

    interface CliInputError {
      readonly code: "input/read-failed";
      readonly path: string;
      readonly message: "Unable to read input file";
    }

`src/cli/json-v2-output.ts` exposes only:

    export function formatJsonV2(
      documents: readonly ValidatedDocument[],
      inputErrors: readonly CliInputError[],
      toolVersion: string,
    ): string;

If sharing the private `ValidatedDocument` type requires a CLI-local `contracts.ts`, add that file inside `src/cli/`; do not promote a top-level reporter module. `formatTerminal()` may keep its Stage 1 per-document signature and be called once per validated record.

The JSON-v2 collection contract is:

- `schemaVersion` is always integer `2`.
- `tool.name` is `mermaid-diagram-validator`; `tool.version` remains `0.1.0` during Stage 2.
- `complete` is true exactly when `inputErrors` is empty.
- `valid` is true exactly when `complete` is true and every emitted document is valid.
- `inputErrors` is sorted by normalized absolute `path`; each entry has stable code `input/read-failed`, bounded message `Unable to read input file`, and no raw Node error.
- `documents` is sorted and contains `uri`, `languageId`, `diagramCount`, optional `version`, `valid`, and projected `findings`.
- `summary` contains integer `documents`, `diagrams`, `findings`, `errors`, `warnings`, `infos`, and `inputErrors`; validation counts are computed from `documents` and the last count equals `inputErrors.length`.
- Finding fields and omission rules remain those documented for JSON-v1, but spans are now always host-document offsets for Markdown.

Dependency ownership is exact:

- `mdast-util-from-markdown@2.0.3` is imported only by `src/validation/markdown/extract-markdown.ts`.
- `globby@16.2.2` is imported only by `src/cli/discovery.ts`.
- `src/cli/config.ts` uses only Node filesystem/path APIs and project-owned JSON shape checks; lilconfig and Zod are absent in Stage 2.
- `commander@15.0.0` remains inside `src/cli/**`.
- `mermaid@11.16.0` and `jsdom@26.1.0` remain inside the existing Canonical Syntax adapter and compatibility observers.
- `@mermaid-lint/core@0.35.0` and `@mermanjs/web@0.7.0` remain development-only Compatibility Evidence.
- No upstream type or error crosses `src/validation/index.ts` or a CLI-local seam.

No supported package-level programmatic interface is introduced. Do not add declaration output, `package.json` exports, installed-package smoke tests, a monorepo split, or publication metadata; Stage 6 owns those decisions.

## Revision Note

2026-07-15: Created the Stage 2 ExecPlan from the completed Stage 1 tree. The plan selects a CommonMark-backed project adapter with segment-level host maps, a small data-only config/discovery surface, and JSON-v2 collection output. It records why the mermaid-lint extractor is insufficient, keeps MDX and Stage 3+ capabilities deferred, and requires unchanged canonical/compatibility evidence on Node 22 and 24.

2026-07-19: Removed configurable `files` inclusion patterns after design review with the user. Stage 2 now uses fixed no-argument discovery defaults, explicit files/directories for direct inclusion, and a single optional config `ignore` field. This keeps the current stage small and removes unnecessary glob-precedence policy.

2026-07-19: Reduced automatic configuration discovery to the nearest upward `mermaid-validator.config.json`, with `--config` as an exact override. The config remains optional; when present, its directory is the no-argument discovery root and its only Stage 2 setting is `ignore`.

2026-07-19: Removed lilconfig and Zod from the Stage 2 dependency plan after agreeing that one fixed JSON filename and one optional field do not justify general configuration libraries. Stage 2 uses project-owned Node search/parsing/validation; Zod is deferred to Stage 3 rule schemas.

2026-07-19: Narrowed `ignore` to exclusion-only forward-slash globs relative to the config root. The project-owned syntax accepts literals, `/`, `*`, `?`, and `**`; negation, absolute paths, parent traversal, backslashes, braces, character classes, and extglobs are rejected. Explicit files bypass ignores. The discovery options explicitly set `dot: true` so the already-required `.github` traversal is implementable while `.git` remains hard-excluded.

2026-07-19: Ratified exact lowercase `mermaid` fence matching and tests that ignore other casing. Also replaced the Markdown subtree's upward reference to public `TextSpan` with private `EmbeddedSpan` and `HostSpan` coordinate types, preserving the documented module boundary.

2026-07-19: Fixed the previously open segment-join mapping policy: non-empty starts project right, non-empty ends project left, empty spans project right, EOF maps to the final body boundary, and invalid spans fail without clamping. The plan now specifies matching unit and acceptance tests.

2026-07-19: Defined parser-system outcomes as block-local: record the failed block, skip retrying it, and continue all later blocks through the Stage 1 worker host's lazy restart. Stage 2 deliberately adds no retry or circuit-breaker policy, and tests cover both recovery and repeated failure.

2026-07-19: Distinguished empty discovery from zero diagrams. Finding no supported files is an exit-2 input failure, but a discovered Markdown file with no recognized Mermaid block is valid with `diagramCount: 0` and exit `0`. The concrete `README.md` transcript now proves zero-block success; `package.json` proves an unsupported explicit file.

2026-07-19: Ratified JSON-v2 as the sole Stage 2 JSON output for both one-file and repository invocations. JSON-v1 remains historical documentation and is not exposed through an additional format selector.

2026-07-19: Adopted ripgrep-style limited best-effort handling after successful discovery. Individual read failures are bounded structured input errors, readable files are still validated, and JSON-v2 exposes `complete: false`, `valid: false`, `inputErrors`, and an input-error summary count. Configuration and discovery failures remain atomic and produce no partial collection.

2026-07-19: Ratified mixed-result exit precedence as `3 > 2 > 1 > 0`: parser/system failure outranks incomplete input, which outranks completed validation errors. JSON and stderr preserve every observed detail regardless of the single process exit class.

2026-07-19: Ratified exact-pinned `globby@16.2.2` as the sole Stage 2 discovery dependency, isolated behind `src/cli/discovery.ts`. Unlike the removed general config libraries, it owns the nontrivial nested `.gitignore` and recursive glob behavior required by repository discovery.

2026-07-19: Ratified exact-pinned `mdast-util-from-markdown@2.0.3` as the adapter-owned CommonMark structure dependency. Its nodes and errors remain private to Markdown extraction, no full remark processor or GFM layer is added, and official Mermaid remains the sole syntax verdict.

2026-07-19: Removed the proposed opaque-frontmatter scanner after agreeing that fence-looking metadata is too uncommon to justify incomplete YAML/TOML boundary semantics. Stage 2 tests real blocks after ordinary frontmatter, follows the CommonMark tree as-is, and documents the possible metadata false positive.

2026-07-19: Ratified direct-file precedence over every discovery exclusion, including `.gitignore`, config ignores, and hard-excluded directory names. Explicit directories remain discovery requests and continue to honor all exclusions.

2026-07-19: Clarified repository boundaries: config-driven discovery and ignore patterns remain within the config root, while explicit user-supplied files and directories may be outside it. Outside-root directory scans honor local `.gitignore` and hard exclusions but not the current config's root-relative ignores.

2026-07-19: Ratified CommonMark behavior for unclosed fences: the block body extends through host EOF, is validated normally, and produces no synthetic Markdown-structure Finding or invented closing marker.

2026-07-19: Ratified the host body as the fallback span for locationless embedded syntax, unsupported-type, and parser-system outcomes. The span excludes fences and unrelated prose, carries `approximate` precision, and is zero-length for an empty body.

2026-07-19: Ratified extraction and map-invariant failures as atomic within one Markdown host. Prevalidation failures prevent all canonical calls; a later outcome-projection failure discards accumulated Findings and stops subsequent calls. Both return one whole-host `system/markdown-extraction-failed` with `diagramCount: 0` and do not stop later repository files.

2026-07-19: Kept package version `0.1.0` through Stage 2 and removed backward-compatibility obligations from the private JSON transition. JSON-v2 directly replaces v1 with no selector, shim, migration, deprecation period, or stability promise; the v1 reference remains implementation history only.

2026-07-19: Implemented and closed Stage 2. Added the two exact adapter-owned dependencies, Markdown extraction and mapping, host validation, config/discovery, collection CLI behavior, JSON-v2, architecture enforcement, checked-in acceptance fixtures, and user/reference documentation. Final frozen-install, 20-file/115-test, and 27-fixture/108-observation gates pass on Node 22.20.0 and Node 24.18.0; Stage 3 remains unstarted.

2026-07-20: Hardened the two P1 source-map findings from implementation review without changing the Stage 2 architecture. Implicitly closed LF/CRLF bodies retain exact copied-segment round trips while embedded EOF maps to the parser's final host boundary. Offset maps now require safe-integer structural coordinates, and root validation rejects any host-out-of-bounds body or projected Finding atomically. The expanded 20-file/120-test gate passes on Node 22.20.0 and Node 24.18.0; compatibility evidence is unchanged.
