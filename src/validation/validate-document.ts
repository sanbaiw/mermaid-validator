import { checkCanonicalSyntax, type SyntaxOutcome } from "./canonical-syntax/index.js";
import type { DocumentSnapshot, ValidateOptions } from "./document.js";
import type { BuiltInFindingCode, Finding, ValidationResult } from "./findings.js";
import {
  extractMarkdownDiagrams,
  projectEmbeddedSpan,
  type EmbeddedSpan,
  type ExtractedDiagram,
  type HostSpan,
} from "./markdown/index.js";
import { sourceLocationToSpan } from "./source-offsets.js";

export interface ValidationDependencies {
  readonly checkSyntax: typeof checkCanonicalSyntax;
  readonly extractMarkdown: typeof extractMarkdownDiagrams;
  readonly projectSpan: typeof projectEmbeddedSpan;
}

const DEFAULT_DEPENDENCIES: ValidationDependencies = {
  checkSyntax: checkCanonicalSyntax,
  extractMarkdown: extractMarkdownDiagrams,
  projectSpan: projectEmbeddedSpan,
};

const FAILURE_CODES = {
  initialization: "system/parser-initialization-failed",
  timeout: "system/parser-timeout",
  runtime: "system/parser-runtime-failed",
  crash: "system/parser-crashed",
  protocol: "system/parser-protocol-error",
} as const satisfies Readonly<Record<string, BuiltInFindingCode>>;

function result(
  document: DocumentSnapshot,
  diagramCount: number,
  findings: readonly Finding[],
): ValidationResult {
  return {
    documentUri: document.uri,
    ...(document.version === undefined ? {} : { documentVersion: document.version }),
    diagramCount,
    valid: findings.every((finding) => finding.severity !== "error"),
    findings,
  };
}

function findingFromSyntaxOutcome(source: string, outcome: SyntaxOutcome): Finding | undefined {
  if (outcome.kind === "accepted") return undefined;
  if (outcome.kind === "syntax-error") {
    const code: BuiltInFindingCode = "mermaid/syntax-error";
    const span = outcome.location ? sourceLocationToSpan(source, outcome.location) : undefined;
    return {
      code,
      severity: "error",
      message: outcome.message,
      source: "mermaid",
      ...(span === undefined ? {} : { span }),
      locationPrecision: span === undefined ? "document" : outcome.locationPrecision,
      ...(outcome.diagramType === undefined ? {} : { diagramType: outcome.diagramType }),
      engine: { name: "mermaid", version: outcome.engineVersion },
    };
  }
  if (outcome.kind === "unsupported-type") {
    const code: BuiltInFindingCode = "mermaid/unsupported-diagram-type";
    return {
      code,
      severity: "error",
      message: outcome.message,
      source: "mermaid",
      locationPrecision: "document",
      diagramType: outcome.diagramType,
      engine: { name: "mermaid", version: outcome.engineVersion },
    };
  }
  const code: BuiltInFindingCode = FAILURE_CODES[outcome.failure];
  return {
    code,
    severity: "error",
    message: outcome.message,
    source: "system",
    locationPrecision: "document",
  };
}

export function resultFromSyntaxOutcome(
  document: DocumentSnapshot,
  outcome: SyntaxOutcome,
): ValidationResult {
  const finding = findingFromSyntaxOutcome(document.text, outcome);
  return result(document, 1, finding === undefined ? [] : [finding]);
}

function extractionFailure(document: DocumentSnapshot, message: string): ValidationResult {
  return result(document, 0, [{
    code: "system/markdown-extraction-failed",
    severity: "error",
    message,
    source: "system",
    span: { startOffset: 0, endOffset: document.text.length },
    locationPrecision: "document",
  }]);
}

function isHostBoundedSpan(span: HostSpan, hostLength: number): boolean {
  return Number.isSafeInteger(span.startOffset)
    && Number.isSafeInteger(span.endOffset)
    && span.startOffset >= 0
    && span.endOffset >= span.startOffset
    && span.endOffset <= hostLength;
}

function projectHostSpan(
  diagram: ExtractedDiagram,
  embeddedSpan: EmbeddedSpan,
  projectSpan: typeof projectEmbeddedSpan,
  hostLength: number,
): HostSpan | undefined {
  try {
    const span = projectSpan(diagram, embeddedSpan);
    return span !== undefined && isHostBoundedSpan(span, hostLength) ? span : undefined;
  } catch {
    return undefined;
  }
}

function mapEmbeddedFinding(
  diagram: ExtractedDiagram,
  finding: Finding,
  projectSpan: typeof projectEmbeddedSpan,
  hostLength: number,
): Finding | undefined {
  if (finding.span === undefined) {
    return isHostBoundedSpan(diagram.hostBodySpan, hostLength)
      ? { ...finding, span: { ...diagram.hostBodySpan }, locationPrecision: "approximate" }
      : undefined;
  }
  const span = projectHostSpan(diagram, finding.span, projectSpan, hostLength);
  return span === undefined ? undefined : { ...finding, span: { ...span } };
}

async function validateMarkdown(
  document: DocumentSnapshot,
  options: ValidateOptions,
  dependencies: ValidationDependencies,
): Promise<ValidationResult> {
  if (options.signal?.aborted) {
    const error = new Error("The operation was aborted");
    error.name = "AbortError";
    throw error;
  }
  const extraction = dependencies.extractMarkdown(document.text);
  if (extraction.kind === "failure") return extractionFailure(document, extraction.message);
  for (const diagram of extraction.diagrams) {
    if (!isHostBoundedSpan(diagram.hostBodySpan, document.text.length)
      || projectHostSpan(
        diagram,
        { startOffset: 0, endOffset: 0 },
        dependencies.projectSpan,
        document.text.length,
      ) === undefined
      || projectHostSpan(diagram, {
        startOffset: diagram.source.length,
        endOffset: diagram.source.length,
      }, dependencies.projectSpan, document.text.length) === undefined) {
      return extractionFailure(document, "Unable to map Mermaid diagram offsets to Markdown");
    }
  }

  const findings: Finding[] = [];
  for (const diagram of extraction.diagrams) {
    if (options.signal?.aborted) {
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    }
    let outcome: SyntaxOutcome;
    try {
      outcome = await dependencies.checkSyntax(
        diagram.source,
        options.signal === undefined ? {} : { signal: options.signal },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      outcome = {
        kind: "engine-failure",
        failure: "protocol",
        message: "Canonical Mermaid parser protocol failed",
      };
    }
    const relativeFinding = findingFromSyntaxOutcome(diagram.source, outcome);
    if (relativeFinding === undefined) continue;
    const hostFinding = mapEmbeddedFinding(
      diagram,
      relativeFinding,
      dependencies.projectSpan,
      document.text.length,
    );
    if (hostFinding === undefined) {
      return extractionFailure(document, "Unable to map Mermaid diagram offsets to Markdown");
    }
    findings.push(hostFinding);
  }
  return result(document, extraction.diagrams.length, findings);
}

export async function validateDocumentWithDependencies(
  document: DocumentSnapshot,
  options: ValidateOptions = {},
  dependencies: ValidationDependencies = DEFAULT_DEPENDENCIES,
): Promise<ValidationResult> {
  const mode = options.mode ?? "canonical";
  if (mode !== "canonical") throw new Error(`Unsupported validation mode: ${String(mode)}`);
  if (document.languageId === "markdown") return await validateMarkdown(document, options, dependencies);
  try {
    return resultFromSyntaxOutcome(
      document,
      await dependencies.checkSyntax(
        document.text,
        options.signal === undefined ? {} : { signal: options.signal },
      ),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return resultFromSyntaxOutcome(document, {
      kind: "engine-failure",
      failure: "protocol",
      message: "Canonical Mermaid parser protocol failed",
    });
  }
}

export async function validateDocument(
  document: DocumentSnapshot,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  return await validateDocumentWithDependencies(document, options);
}
