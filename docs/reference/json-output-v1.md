# JSON output v1

> Historical reference: the Stage 2 CLI emits JSON-v2 only. There is no v1 selector or compatibility shim. See [JSON output v2](./json-output-v2.md).

`node dist/cli/main.js --format json <file>` writes exactly one JSON object followed by a newline for every completed validation. Command usage and file-input failures write no JSON; they use stderr and exit `2`.

## Envelope

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Always `1` for this contract. |
| `tool.name` | string | Always `mermaid-diagram-validator`. |
| `tool.version` | string | Validator version that produced the result. |
| `document.uri` | string | Absolute `file:` URI of the validated standalone document. |
| `document.version` | integer, optional | In-memory snapshot version when the caller supplied one. The Stage 1 CLI omits it. |
| `valid` | boolean | `true` exactly when the result has no error-severity Finding. |
| `findings` | array | Ordered project-owned diagnostics. |

`valid: false` with a `source: "system"` Finding means validation was indeterminate or incomplete. It does not assert that the Mermaid source is syntactically invalid.

## Finding

Every Finding contains `code`, `severity`, `message`, `source`, and `locationPrecision`.

- `code` is a stable namespaced identifier.
- `severity` is `error`, `warning`, or `info`. Stage 1 produces only errors.
- `source` is `mermaid`, `rule`, or `system`. Stage 1 does not produce rule Findings.
- `locationPrecision` is `exact`, `approximate`, or `document`. Official Mermaid parser locations are approximate; `document` means no usable narrower location exists.
- `span`, when present, contains `startOffset` and `endOffset`. Both are zero-based UTF-16 code-unit offsets in the original standalone document, and the span is half-open: start is included and end is excluded.
- `diagramType`, `engine`, and `help` are optional and are omitted when absent rather than serialized as `null`.
- `engine`, when present in Stage 1, names `mermaid` and its exact runtime version.

Raw Mermaid hashes, stacks, expected-token arrays, JSDOM values, worker paths, and internal stderr capture are never part of JSON-v1.

## Stable Stage 1 codes

- `mermaid/syntax-error`
- `mermaid/unsupported-diagram-type`
- `system/parser-initialization-failed`
- `system/parser-timeout`
- `system/parser-runtime-failed`
- `system/parser-crashed`
- `system/parser-protocol-error`

## Examples

Valid source:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "mermaid-diagram-validator", "version": "0.1.0" },
  "document": { "uri": "file:///workspace/valid.mmd" },
  "valid": true,
  "findings": []
}
```

Syntax error with an approximate one-unit span:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "mermaid-diagram-validator", "version": "0.1.0" },
  "document": { "uri": "file:///workspace/invalid.mmd" },
  "valid": false,
  "findings": [
    {
      "code": "mermaid/syntax-error",
      "severity": "error",
      "message": "Mermaid syntax error: Parse error on line 2",
      "source": "mermaid",
      "span": { "startOffset": 16, "endOffset": 17 },
      "locationPrecision": "approximate",
      "diagramType": "flowchart",
      "engine": { "name": "mermaid", "version": "11.16.0" }
    }
  ]
}
```

Officially valid but unsupported family:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "mermaid-diagram-validator", "version": "0.1.0" },
  "document": { "uri": "file:///workspace/timeline.mmd" },
  "valid": false,
  "findings": [
    {
      "code": "mermaid/unsupported-diagram-type",
      "severity": "error",
      "message": "Mermaid diagram type \"gantt\" is not supported",
      "source": "mermaid",
      "locationPrecision": "document",
      "diagramType": "gantt",
      "engine": { "name": "mermaid", "version": "11.16.0" }
    }
  ]
}
```

Parser infrastructure failure:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "mermaid-diagram-validator", "version": "0.1.0" },
  "document": { "uri": "file:///workspace/diagram.mmd" },
  "valid": false,
  "findings": [
    {
      "code": "system/parser-timeout",
      "severity": "error",
      "message": "Canonical Mermaid parser timed out after 10000ms",
      "source": "system",
      "locationPrecision": "document"
    }
  ]
}
```

## Compatibility

Patch releases may add optional fields. They may not remove an existing field, make an optional field required, or reinterpret an existing value. Any breaking shape or semantic change requires a new `schemaVersion`.
