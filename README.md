# Mermaid Validator

A TypeScript/Node validator that uses exact-pinned official Mermaid as the canonical syntax authority. The public `0.x` preview validates standalone Mermaid files and exact-lowercase `mermaid` fenced blocks in Markdown through the repository-aware CLI, with configurable rules and bounded safe fixes. The repository also contains an unsaved-buffer language server for development use.

Rendering, geometry checks, layout comparison, model-based visual review, Semantic Facts, public plugin loading, and MCP remain deferred.

## Installation and requirements

- Node.js `^22.13.0` or `>=24.0.0`; `.nvmrc` pins Node 24.18.0.

Install the CLI with npm or pnpm:

```sh
npm install --global mermaid-validator
pnpm add --global mermaid-validator
```

Then run the executable from any repository:

```sh
mermaid-validator [--format terminal|json] [--config path] [--fix|--fix-dry-run] [paths...]
```

The package is a CLI-only executable preview and has no supported programmatic import. Its empty package `exports` map deliberately blocks JavaScript and TypeScript imports while the internal contracts continue to evolve through Stage 5. The language server is not included in the npm package; its publication is deferred.

## Development build

Development uses pnpm `10.30.1`. From this checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Run the locally built CLI directly:

```sh
node dist/cli/main.js [--format terminal|json] [--config path] [--fix|--fix-dry-run] [paths...]
```

The checkout-only language server supports stdio after a development build:

```sh
node dist/lsp/main.js --stdio
```

It validates exact `mermaid` and `markdown` open-buffer language ids, publishes versioned UTF-16 diagnostics, and offers current-version planner-backed Quick Fixes to capable clients. It never rereads or writes an open document. See the [language server reference](./docs/reference/language-server.md).

Supported file extensions are `.mmd`, `.mermaid`, and `.md`, case-insensitively. `.markdown`, `.mdx`, and URLs are not supported.

## Inputs and discovery

Name one or more files or directories, or pass no paths to scan from the resolved configuration root:

```sh
node dist/cli/main.js diagram.mmd docs/ README.md
node dist/cli/main.js
```

Directory and default discovery recurse through supported files, include dot directories such as `.github`, honor nested `.gitignore` files, and always exclude `.git`, `node_modules`, and `dist`. An explicitly named supported file bypasses these ignores; an explicit directory remains a discovery request and honors them.

Markdown extraction recognizes CommonMark backtick and tilde fences whose parsed language is exactly lowercase `mermaid`. Differently cased labels such as `Mermaid` are ignored. Lists, blockquotes, CRLF, Unicode, multiple blocks, and EOF-closed fences retain ranges in the original host document. Stage 2 does not special-case frontmatter: a fence CommonMark recognizes inside metadata may be extracted.

The optional nearest-upward `mermaid-validator.config.json` contains root-relative exclusions, base rule settings, and ordered per-file overrides:

```json
{
  "ignore": ["drafts/**", "docs/generated-?.md"],
  "rules": {
    "flowchart/no-markdown-heading-in-label": "warning"
  },
  "overrides": [
    {
      "files": ["docs/strict/**"],
      "rules": { "flowchart/no-markdown-heading-in-label": "error" }
    }
  ]
}
```

Use `--config path` to load exactly one file. See the [configuration reference](./docs/reference/configuration.md) for precedence, pattern restrictions, and repository boundaries.

## Output and exit codes

Valid input with no rule findings produces no terminal output. Findings use compiler-style paths and coordinates in the original host document; a fixable Finding ends with `[fixable]`. Non-exact locations are labeled and include bounded host context plus any project-owned advisory help:

```text
/absolute/path/guide.md:12:49: error mermaid/syntax-error [approximate]: Mermaid syntax error: Parse error near diagram line 7
  12 |     Note over B: valid history;<br/>damaged history
     | location is approximate; inspect this host line
     | help: In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation.
```

`[approximate]` means the coordinate navigates near the area reported by Mermaid, not that it selects the exact failing token. `[document]` means no narrower trustworthy location exists. Exact Findings omit the precision marker.

`--format json` always emits one deterministic JSON-v2 collection, even for one file. It includes per-document diagram counts, collection completeness, bounded read errors, and summary counts. See the [JSON-v2 reference](./docs/reference/json-output-v2.md).

`--fix-dry-run` computes and revalidates the same in-memory plan as `--fix` but never writes. JSON preview output keeps top-level results tied to unchanged disk content and nests `output` plus `proposedResult` under the document's `fix` object. `--fix` writes each safe document independently, reports post-fix results after successful writes, and continues later files after a bounded write failure. See [rules and fixes](./docs/reference/rules-and-fixes.md).

After discovery, unreadable files are reported on stderr while readable files are still validated. JSON marks that collection `complete: false`; terminal and JSON use the same exit precedence.

Ordinary terminal mode writes each completed document's diagnostics before validating the next document; valid documents stay silent. JSON output remains one complete object written only after validation finishes. Canonical parser timeout messages distinguish startup from request work while retaining `system/parser-timeout`. Within one validator process, a startup failure or two consecutive request timeouts temporarily suppress further worker starts; affected later diagrams receive `system/parser-restart-suppressed` and are never reported as valid. Suppression is demand-driven and does not coordinate separate CLI or LSP processes.

| Code | Meaning |
|---:|---|
| `0` | The complete collection has no error finding. |
| `1` | Validation completed, but Mermaid syntax, an unsupported family, or an error-severity rule made the reported contents invalid. |
| `2` | Configuration, discovery, usage, or file reads/writes made the collection incomplete. |
| `3` | A canonical parser, Markdown extraction, rule runtime/protocol, or fix-safety system failure made validation indeterminate. |

For mixed results, precedence is `3 > 2 > 1 > 0`. `--version` prints `0.3.2` without starting discovery or the parser worker.

## Development evidence and scope

`pnpm check` runs strict typechecking, the build, repository hygiene, and all tests. `pnpm compatibility` reruns the independent Stage 0 evidence across 27 fixtures and 108 observations. The selected canonical profile and reuse boundary are recorded in [ADR 0001](./docs/adr/0001-validation-foundation.md).

The npm package is a pre-release CLI-only preview. JSON-v1 is historical only; JSON-v2 remains the CLI schema. Programmatic rule registration, Diagram Validation imports, and LSP distribution and initialization contracts remain unsupported package APIs through Stage 5. See the [release reference](./docs/reference/releasing.md), [DRAFT-PLAN.md](./DRAFT-PLAN.md) for later stages, and [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries.
