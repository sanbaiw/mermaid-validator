# Mermaid Diagram Validator

A private TypeScript/Node validator that uses exact-pinned official Mermaid as the canonical syntax authority. Stage 1 validates one standalone Flowchart, Sequence, Pie, Class, or State diagram and reports deterministic terminal or JSON output.

Rendering, geometry checks, layout comparison, and model-based visual review remain deferred.

## Requirements and build

- Node.js `^22.13.0` or `>=24.0.0`; `.nvmrc` pins the project Node 24 runtime.
- pnpm `10.30.1`.

From this checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
```

The package is private and has no supported package-level programmatic import. Run the built entry directly:

```sh
node dist/cli/main.js [--format terminal|json] <file.mmd>
```

The CLI accepts one explicit local path with a case-insensitive `.mmd` or `.mermaid` extension. It does not discover sibling files, expand globs, read Markdown, load configuration, or follow URLs.

## Output

Valid source produces no terminal output and exits successfully:

```sh
node dist/cli/main.js fixtures/compatibility/flowchart/valid-minimal.mmd
```

Invalid syntax produces a compiler-style finding on stdout:

```text
/absolute/path/invalid-edge.mmd:2:4: error mermaid/syntax-error: Mermaid syntax error: <bounded detail>
```

Use JSON-v1 for structured output:

```sh
node dist/cli/main.js --format json fixtures/compatibility/flowchart/invalid-edge.mmd
```

The [JSON-v1 reference](./docs/reference/json-output-v1.md) defines every field, offset convention, stable Stage 1 code, and compatibility rule.

Exit codes are:

| Code | Meaning |
|---:|---|
| `0` | Validation completed with no error finding. |
| `1` | Mermaid syntax is invalid or the official diagram family is unsupported. |
| `2` | Command usage or file input prevented validation. |
| `3` | Canonical parser infrastructure failed, so validation was incomplete. |

`--version` prints `0.1.0` without starting the parser worker. `--help` prints the command help.

## Development evidence and scope

`pnpm check` runs strict typechecking, the build, repository hygiene, and all tests. `pnpm compatibility` reruns the independent Stage 0 evidence across 27 fixtures and four engine paths. The selected canonical profile and reuse boundary are recorded in [ADR 0001](./docs/adr/0001-validation-foundation.md).

Markdown extraction, repository discovery, configuration, rules and fixes, LSP, product Semantic Facts, MCP, CI formats, and every visual feature are not implemented. See [DRAFT-PLAN.md](./DRAFT-PLAN.md) for those later stages and [ARCHITECTURE.md](./ARCHITECTURE.md) for current module boundaries.
