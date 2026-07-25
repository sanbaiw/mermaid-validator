# Configuration

Stage 3 supports one optional JSON configuration file named `mermaid-validator.config.json`. Starting from the current working directory, the CLI searches upward to the filesystem root and uses the nearest file. `--config <path>` disables that search and loads exactly the named file. A missing or invalid explicit file is an exit-`2` input failure.

The directory containing the loaded config is the config root. With no positional paths, discovery begins there. Without a config, the current working directory is the root. Configuration is fully validated before discovery or file reads.

## Shape

The top-level fields are `ignore`, `rules`, and `overrides`; all are optional and unknown fields are rejected.

```json
{
  "ignore": ["drafts/**", "docs/generated-?.md"],
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
```

A rule setting is `"off"`, `"warning"`, or `"error"`, or a two-item `[severity, options]` tuple. Rule ids, severities, tuple lengths, and options are strict. Stage 3's built-in rule accepts only an empty options object, so unknown option keys fail configuration loading. Disabling is config-only; Mermaid comments are not interpreted as validator controls and there is no one-shot CLI disable flag.

Base `rules` and each override are sparse patches: they change only ids they explicitly name. Every matching override applies in declaration order, and later explicit settings win. Built-in defaults are filled once after layering, so an override for one rule cannot reset an unrelated base rule.

## Patterns and path behavior

Every `ignore` or override `files` pattern is a forward-slash path relative to the config root. The supported syntax is literals plus:

- `*` for zero or more characters within one path segment;
- `?` for one character within one path segment;
- `**` for recursive path segments.

Negation (`!`), absolute paths, `..` segments, backslashes, braces, character classes, and extglobs are rejected. This is a deliberately small project-owned dialect. Override matching uses the normalized config-root-relative path. An explicitly named file outside the config root receives base rules but no root-relative override.

## Discovery and boundaries

Default discovery uses fixed case-insensitive patterns for `**/*.mmd`, `**/*.mermaid`, and `**/*.md`. Directory discovery honors nested `.gitignore` files and config ignores inside the config root. `.git`, `node_modules`, and `dist` are always excluded from directory scans.

Config-driven patterns never traverse above the config root. Explicit user paths may point outside it:

- An explicit supported file bypasses `.gitignore`, config ignores, and hard exclusions.
- An explicit directory is recursively discovered and still honors nested `.gitignore` and hard exclusions.
- An outside-root explicit directory does not receive root-relative ignores or overrides; its files use the base rule patch.

Missing paths, unsupported explicit files, invalid configs, and discovery that finds no supported files produce one concise stderr message, no validation collection, and exit `2`. A discovered Markdown file with no recognized Mermaid block is a successful document with `diagramCount: 0`.
