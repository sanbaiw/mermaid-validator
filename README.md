# Mermaid Diagram Validator

A private TypeScript/Node validator that uses exact-pinned official Mermaid as the canonical syntax authority. Stage 2 validates standalone Mermaid files and exact-lowercase `mermaid` fenced blocks in Markdown, with repository discovery and host-document source ranges.

Rendering, geometry checks, layout comparison, model-based visual review, rules, fixes, LSP, Semantic Facts, and MCP remain deferred.

## Requirements and build

- Node.js `^22.13.0` or `>=24.0.0`; `.nvmrc` pins Node 24.18.0.
- pnpm `10.30.1`.

From this checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
```

The package is private and has no supported package-level programmatic import. Run the built entry directly:

```sh
node dist/cli/main.js [--format terminal|json] [--config path] [paths...]
```

Supported file extensions are `.mmd`, `.mermaid`, and `.md`, case-insensitively. `.markdown`, `.mdx`, and URLs are not supported.

## Inputs and discovery

Name one or more files or directories, or pass no paths to scan from the resolved configuration root:

```sh
node dist/cli/main.js diagram.mmd docs/ README.md
node dist/cli/main.js
```

Directory and default discovery recurse through supported files, include dot directories such as `.github`, honor nested `.gitignore` files, and always exclude `.git`, `node_modules`, and `dist`. An explicitly named supported file bypasses these ignores; an explicit directory remains a discovery request and honors them.

Markdown extraction recognizes CommonMark backtick and tilde fences whose parsed language is exactly lowercase `mermaid`. Differently cased labels such as `Mermaid` are ignored. Lists, blockquotes, CRLF, Unicode, multiple blocks, and EOF-closed fences retain ranges in the original host document. Stage 2 does not special-case frontmatter: a fence CommonMark recognizes inside metadata may be extracted.

The optional nearest-upward `mermaid-validator.config.json` contains only root-relative exclusions:

```json
{
  "ignore": ["drafts/**", "docs/generated-?.md"]
}
```

Use `--config path` to load exactly one file. See the [configuration reference](./docs/reference/configuration.md) for precedence, pattern restrictions, and repository boundaries.

## Output and exit codes

Valid input produces no terminal output. Findings use compiler-style host paths and coordinates:

```text
/absolute/path/guide.md:12:7: error mermaid/syntax-error: Mermaid syntax error: <bounded detail>
```

`--format json` always emits one deterministic JSON-v2 collection, even for one file. It includes per-document diagram counts, collection completeness, bounded read errors, and summary counts. See the [JSON-v2 reference](./docs/reference/json-output-v2.md).

After discovery, unreadable files are reported on stderr while readable files are still validated. JSON marks that collection `complete: false`; terminal and JSON use the same exit precedence.

| Code | Meaning |
|---:|---|
| `0` | The complete collection has no error finding. |
| `1` | Validation completed, but Mermaid syntax is invalid or a diagram family is unsupported. |
| `2` | Configuration, discovery, usage, or file reads made the collection incomplete. |
| `3` | A canonical parser or Markdown extraction system failure made validation indeterminate. |

For mixed results, precedence is `3 > 2 > 1 > 0`. `--version` prints `0.1.0` without starting discovery or the parser worker.

## Development evidence and scope

`pnpm check` runs strict typechecking, the build, repository hygiene, and all tests. `pnpm compatibility` reruns the independent Stage 0 evidence across 27 fixtures and 108 observations. The selected canonical profile and reuse boundary are recorded in [ADR 0001](./docs/adr/0001-validation-foundation.md).

The package remains private and pre-release. JSON-v1 is historical only; Stage 2 emits v2 without a compatibility selector. See [DRAFT-PLAN.md](./DRAFT-PLAN.md) for later stages and [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries.
