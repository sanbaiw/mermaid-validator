# Configuration

Stage 2 supports one optional JSON configuration file named `mermaid-validator.config.json`. Starting from the current working directory, the CLI searches upward to the filesystem root and uses the nearest file. `--config <path>` disables that search and loads exactly the named file. A missing or invalid explicit file is an exit-`2` input failure.

The directory containing the loaded config is the config root. With no positional paths, discovery begins there. Without a config, the current working directory is the root.

## Shape

The only field is optional `ignore`:

```json
{
  "ignore": ["drafts/**", "docs/generated-?.md"]
}
```

Unknown fields are rejected. Every pattern is an exclusion-only, forward-slash path relative to the config root. The supported pattern syntax is literals plus:

- `*` for zero or more characters within one path segment;
- `?` for one character within one path segment;
- `**` for recursive path segments.

Negation (`!`), absolute paths, `..` segments, backslashes, braces, character classes, and extglobs are rejected. This deliberately exposes a small project-owned dialect rather than all Globby syntax.

## Discovery and boundaries

Default discovery uses fixed case-insensitive patterns for `**/*.mmd`, `**/*.mermaid`, and `**/*.md`. Directory discovery honors nested `.gitignore` files and config ignores inside the config root. `.git`, `node_modules`, and `dist` are always excluded from directory scans.

Config-driven patterns never traverse above the config root. Explicit user paths may point outside it:

- An explicit supported file bypasses `.gitignore`, config ignores, and hard exclusions.
- An explicit directory is recursively discovered and still honors nested `.gitignore` and hard exclusions.
- An outside-root explicit directory does not receive the current config's root-relative ignores.

Missing paths, unsupported explicit files, invalid configs, and discovery that finds no supported files produce one concise stderr message, no validation collection, and exit `2`. A discovered Markdown file with no recognized Mermaid block is different: it is a successful document with `diagramCount: 0`.
