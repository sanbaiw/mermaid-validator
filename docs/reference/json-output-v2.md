# JSON output v2

`node dist/cli/main.js --format json [paths...]` writes one JSON object followed by a newline after successful non-empty discovery. Configuration and discovery failures write no JSON. JSON-v2 is the only current CLI JSON format; this private pre-release schema has no backward-compatibility promise.

## Collection envelope

| Field | Type | Meaning |
|---|---|---|
| `schemaVersion` | integer | Always `2`. |
| `tool` | object | Fixed name `mermaid-validator` and current tool version. |
| `complete` | boolean | `true` exactly when no file read or write failed. |
| `valid` | boolean | `true` exactly when the collection is complete and every emitted document is valid. |
| `inputErrors` | array | Sorted bounded file-read and file-write errors. |
| `documents` | array | Successfully read documents in deterministic discovery order. |
| `summary` | object | Counts for documents, diagrams, findings, severities, and input errors. |

Each input error has a normalized absolute `path` and one enforced code/message pair: `input/read-failed` with `Unable to read input file`, or `input/write-failed` with `Unable to write input file`. Raw Node errors are never exposed. Readable documents remain present when the collection is incomplete.

## Documents and findings

Each document contains `uri`, `languageId` (`mermaid` or `markdown`), `diagramCount`, optional `version`, `valid`, and ordered `findings`. A standalone Mermaid document has one diagram. Markdown counts recognized lowercase Mermaid fences, including invalid diagrams; zero-block Markdown has count zero and can be valid.

Every Finding contains `code`, `severity`, `message`, `source`, and `locationPrecision`. Optional `span`, `diagramType`, `engine`, `help`, and `fixes` fields are omitted when absent rather than serialized as `null`. Each fix contains a host-document `span` and replacement `newText`.

Spans are zero-based, half-open UTF-16 code-unit offsets in the original host document. Markdown spans never refer to a temporary extracted string. Mermaid parser coordinates are projected through the embedded offset map with `approximate` precision; locationless embedded outcomes use the responsible block body with `approximate` precision.

JSON exposes only this host-document `span`; there is no diagram-relative `engineLocation` field in the contract. Optional syntax `help` is project-owned advisory text. It may explain a conservatively recognized error shape, but it never changes the exact-pinned official Mermaid verdict, Finding severity, or validity.

Stable Stage 3 codes are:

- `mermaid/syntax-error`
- `mermaid/unsupported-diagram-type`
- `system/markdown-extraction-failed`
- `system/parser-initialization-failed`
- `system/parser-timeout`
- `system/parser-runtime-failed`
- `system/parser-crashed`
- `system/parser-protocol-error`
- `system/rule-runtime-failed`
- `system/rule-protocol-error`
- `system/fix-conflict`
- `system/fix-protocol-error`
- `system/fix-validation-failed`
- `system/fix-non-idempotent`
- `input/read-failed` (collection input error, not a Finding)
- `input/write-failed` (collection input error, not a Finding)

## Fix-mode projection

Only fix modes add a document `fix` object. It always contains final `status`, `editCount`, and sorted `edits`.

- `unchanged` means the complete enabled selection proposed no edit.
- `previewed` is dry-run-only and includes full proposed `output` plus nested `proposedResult`.
- `applied` means the write succeeded; the top-level document is the post-fix result and full output is omitted.
- `blocked` means the document-local plan was unsafe, conflicting, invalid, or non-idempotent; the file is unchanged.
- `write-failed` means a safe output was planned but the write failed; the top-level document remains the original result.

In dry-run, the top-level result and collection summary always describe unchanged disk contents. Nested `proposedResult` describes `output`, and every nested span uses offsets into that proposed text. Its Findings do not contribute to the collection summary. Apply mode reports post-fix Findings only after a successful write.

## Example

```json
{
  "schemaVersion": 2,
  "tool": { "name": "mermaid-validator", "version": "0.3.2" },
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
          "message": "Mermaid syntax error: Parse error near diagram line 15",
          "source": "mermaid",
          "span": { "startOffset": 84, "endOffset": 85 },
          "locationPrecision": "approximate",
          "diagramType": "sequence",
          "engine": { "name": "mermaid", "version": "11.16.0" },
          "help": "In a Sequence Note, ';' before '<br/>' ends the Mermaid statement; replace it with other punctuation or an escaped representation."
        }
      ],
      "fix": {
        "status": "blocked",
        "editCount": 0,
        "edits": []
      }
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
```

If one file could not be read or written, `complete` and `valid` are false, `inputErrors` and `summary.inputErrors` record it, and other readable documents still appear. Unsupported diagrams, rule failures, and parser system failures use the same document/Finding shape; exit precedence remains `3 > 2 > 1 > 0`.
