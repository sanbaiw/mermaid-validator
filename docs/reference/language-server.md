# Language server reference

Stage 4 provides a private, built Language Server Protocol (LSP) process for editor and coding-agent integrations. The package is still private and does not promise an installed-package or programmatic API. Build the checkout, then start the server directly over stdio:

```sh
pnpm build
node dist/lsp/main.js --stdio
```

`--stdio` is the only transport. Missing, repeated, socket, pipe, IPC, or unknown arguments exit with status `2` and a bounded usage line on stderr before any protocol bytes are written to stdout. LSP framing owns stdout completely.

## Documents and diagnostics

The server accepts exact language identifiers `mermaid` and `markdown`. It treats every URI scheme as an opaque document identity, including `file:`, `untitled:`, and editor-specific virtual schemes. An open buffer is the only source of truth: the server does not convert a URI to a path, reread the file, discover configuration, or write document contents.

Clients send incremental `didOpen`, `didChange`, and `didClose` notifications. Validation uses exact-pinned official Mermaid plus the current built-in rule selection through the same in-memory Diagram Validation operation as the CLI. The server publishes versioned diagnostics after a 150 ms per-document debounce. A newer version cancels active work, invalidates the previous accepted result, and rejects late results by URI, version, and scheduler generation. Closing a document publishes an empty diagnostic list and discards its state.

Positions are zero-based UTF-16 LSP positions derived from the host-document offsets returned by Diagram Validation. This preserves CRLF, surrogate pairs, combining characters, and Markdown list or blockquote prefixes. A Finding without a trustworthy span uses the zero-width range `(0,0)–(0,0)`. Diagnostics preserve the core code, severity, and message and use the fixed protocol source `mermaid-validator`.

Unsupported language identifiers receive an empty diagnostic publication. They are not inferred from a URI extension and are never read from disk.

## Private initialization options

`initializationOptions` may be absent, `null`, or a strict object with only these optional fields:

```json
{
  "debounceMs": 150,
  "rules": {
    "flowchart/no-markdown-heading-in-label": "warning"
  }
}
```

`debounceMs` must be a safe integer from `0` through `2000`; zero is useful for deterministic clients and tests. `rules` uses the CLI base rule-map grammar: a severity (`off`, `warning`, or `error`) or `[severity, options]` tuple for a known rule. Unknown fields, rule ids, severities, tuple shapes, or options fail `initialize` atomically with JSON-RPC invalid params code `-32602` and a bounded message.

These options are private and server-global. The LSP does not read or watch `mermaid-validator.config.json`, implement `workspace/configuration`, apply CLI path overrides, or handle dynamic configuration. Restart the process to change options.

## Quick Fixes

The initialize response advertises Quick Fix Code Actions only when the client supports literal Code Actions and versioned `workspaceEdit.documentChanges`. Diagnostics still work for other clients, and the always-registered Code Action handler returns an empty array when those capabilities are absent.

For a current fixable diagnostic, the server may return one action titled `Apply all safe Mermaid fixes in this document`. The request must contain an exact visible-field match for a current cached fixable diagnostic. The server then reruns `planDocumentFixes()` against a fresh copy of the complete current buffer with the same resolved rules. It returns an action only when the planner accepts a nonempty, conflict-free, canonically safe, whole-selection-idempotent edit set and the open version is still unchanged.

The action is `quickfix`, lists every current fixable diagnostic in the document, and contains one versioned `TextDocumentEdit`. It does not set `isPreferred`, run a command, call `workspace/applyEdit`, or write a file. If the document changes, closes, cancellation arrives, the planner refuses the edit, or an edit range is defensive-invalid, request the action again after current diagnostics arrive.

## Lifecycle and troubleshooting

A client initializes the process, sends `initialized`, manages documents, sends `shutdown`, waits for its response, and finally sends `exit`. Exit after shutdown returns status `0`; exit without shutdown returns status `1` through the official Node language-server lifecycle.

If initialization returns `-32602`, remove unknown option fields and validate the debounce/rule values. If diagnostics do not appear, confirm that the document is open with language id `mermaid` or `markdown` and that the client reads versioned push diagnostics. If a Quick Fix is absent, confirm client capabilities, wait for diagnostics for the current version, and include the current diagnostic in the Code Action context. Unexpected validation or fix-planning failures write only a fixed bounded line to stderr and keep the server available; raw upstream errors and stacks are not sent through the protocol.

Editor-extension packaging, configuration-file discovery or watching, noncanonical fast mode, Semantic Facts, public plugins/APIs, MCP, SARIF/JUnit/CI integrations, rendering, geometry, images, layout comparison, and vision features are not part of Stage 4.
