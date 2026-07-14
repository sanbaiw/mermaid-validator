# ADR 0001: Validation foundation and reuse boundary

- Status: Accepted
- Date: 2026-07-14
- Scope: Stage 0 compatibility and reuse spike

## Context

The validator needs one canonical Mermaid syntax verdict and a replaceable source of semantic facts. Stage 0 compared four isolated engine paths over 27 repository-local fixtures: direct official Mermaid, the public `@mermaid-lint/core` official helper, the public aggregate mermaid-lint validator, and Merman. The corpus covers Flowchart, Sequence, Pie, Class, and State with 12 valid and 15 invalid diagrams. Each engine ran in a separate Node child process so DOM globals, WASM state, crashes, and malformed worker output could not contaminate another observation.

Official Mermaid is the only syntax authority. Independent paths are measured for reuse and fact coverage; agreement between them cannot turn an official rejection into acceptance.

## Decision

Canonical validation will use a project-owned adapter around `mermaid@11.16.0`. The adapter creates a JSDOM window before dynamically importing Mermaid, then initializes this exact non-rendering profile:

```json
{
  "startOnLoad": false,
  "securityLevel": "strict",
  "suppressErrorRendering": true
}
```

It calls `detectType()` opportunistically and always awaits `parse(source, { suppressErrors: false })` for the verdict. On Node 22.20.0, this JSDOM-only path accepted all 12 valid fixtures, rejected all 15 invalid fixtures, and had zero engine failures. No browser fallback is needed for the tested profile.

`@mermaid-lint/core@0.35.0` will be reused selectively behind local adapters:

- Its public `validateWithMermaidJS()` export is safe to wrap as an upstream official-parser observation. It agreed with direct official Mermaid on all 27 fixtures. It does not replace the direct canonical adapter because it initializes Mermaid with its own `securityLevel: "loose"` profile.
- Its public extraction, discovery, configuration, diagnostics, and fix exports remain candidates for later stages, subject to their stage-specific source-mapping and API contract tests.
- Its public `validateBlock()` export must not define canonical mode. It accepts a successful Merman result without invoking official Mermaid. In this corpus that fast path accepted `pie-invalid-header` while direct Mermaid rejected it.
- Its closed built-in rule registry does not define this project's planned public plugin API. A focused upstream contribution for a force-official mode, fast-path provenance, or an external-rule seam would be generally useful, but none blocks Stage 1.

No fork is needed. The required correctness boundary is expressible with project-owned adapters and direct official parsing.

`@mermanjs/web@0.7.0` remains an optional, replaceable semantic-facts accelerator. It never overrides the canonical verdict. Its selected facts matched all 12 tested valid fixtures across Flowchart (3), Sequence (2), Pie (2), Class (2), and State (3). Composite State internals are stored under each state's recursive `doc`; the project adapter now includes the nested `Working` and `Waiting` states and their internal transitions instead of inspecting only top-level `states` and `relations`. `complete-for-fixture` remains a fixture-level comparison rather than a claim of grammar-wide completeness. Merman also accepted the invalid `pieChart` header, reinforcing that it cannot supply syntax truth.

The planned package name is `mermaid-diagram-validator`. An npm registry lookup on 2026-07-14 returned E404, but absence is not a reservation; the name must be checked again immediately before publication. The package remains `private: true` throughout the spike.

## Evaluated dependency profile

The direct exact pins are:

| Role | Package | Version |
|---|---|---:|
| Canonical parser | `mermaid` | `11.16.0` |
| Reusable lint foundation | `@mermaid-lint/core` | `0.35.0` |
| Optional facts engine | `@mermanjs/web` | `0.7.0` |
| Stage 0 DOM | `jsdom` | `26.1.0` |
| DOM types | `@types/jsdom` | `21.1.7` |
| Node types | `@types/node` | `24.13.3` |
| Compiler | `typescript` | `7.0.2` |
| Test runner | `vitest` | `4.1.10` |

`pnpm-lock.yaml` resolves one effective copy each of Mermaid `11.16.0`, Merman `0.7.0`, and JSDOM `26.1.0`. The compatible ranges declared by `@mermaid-lint/core` dedupe to those project-owned direct pins, so both mermaid-lint adapter paths exercise the same Mermaid and Merman versions listed above.

The verified local runtimes are Node `22.20.0` and Node `24.18.0` with pnpm `10.30.1`. `.nvmrc` exact-pins Node `24.18.0` for project-local selection while the package engine range and frozen-lockfile CI matrix continue to cover Node 22 and 24. Frozen install, the 20-test full check, and the 16-test focused compatibility gate pass on both local runtimes. The repository still has no configured remote, so hosted CI is not claimed as executed evidence.

## Corpus results

| Family | Valid / invalid | Direct official result | Official locations on invalid fixtures | Merman selected facts |
|---|---:|---|---:|---|
| Flowchart | 3 / 3 | 6 of 6 matched | 2 of 3 | Complete for all 3 valid fixtures |
| Sequence | 2 / 3 | 5 of 5 matched | 2 of 3 | Complete for both valid fixtures |
| Pie | 2 / 3 | 5 of 5 matched | 0 of 3 | Complete for both valid fixtures; invalid header falsely accepted |
| Class | 2 / 3 | 5 of 5 matched | 2 of 3 | Complete for both valid fixtures |
| State | 3 / 3 | 6 of 6 matched | 3 of 3 | Complete for all 3 valid fixtures, including recursive composite facts |

Across all invalid fixtures, direct Mermaid and the mermaid-lint official helper supplied structured line or column data for 9 of 15 rejections. That ratio measures availability, not coordinate correctness. Five representative direct-official fixtures now have explicit expectations: four approximate line/column spans and one document-only Pie diagnostic, all five of which match. When Mermaid supplies both fields, normalization prefers `hash.loc.first_line`, which tracked the offending source line in the corpus, over the inconsistent `hash.line`; locations still remain approximate and no adapter invents an exact token range. Merman supplied no structured location for its 14 rejections. The aggregate mermaid-lint and Merman paths each matched 26 of 27 canonical verdicts because both accepted `pie-invalid-header`.

The checked-in Vitest snapshot contains all 108 normalized observations and a focused discrepancy list. Structured mermaid-lint diagnostics preserve their string `message` instead of collapsing to `[object Object]`; messages are reduced to one line, and snapshots omit stacks, absolute temporary paths, raw Mermaid error hashes, and raw Merman parse objects.

## Consequences

Stage 1 can proceed with direct official parsing under JSDOM and does not need a browser dependency, a Mermaid CLI dependency, or an upstream fork. The long-lived serialized worker, restart behavior, public findings, and CLI remain Stage 1 work; the Stage 0 child processes are evidence isolation only.

Later semantic rules may use Merman facts only with per-family completeness metadata. Composite State rules that require nested-state completeness must remain skipped until the facts adapter gains a proven complete source.
