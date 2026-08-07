import { checkCanonicalSyntax, type SyntaxOutcome } from "./canonical-syntax/index.js";
import type { DocumentSnapshot, ValidateOptions } from "./document.js";
import type { BuiltInFindingCode, Finding, TextEdit, ValidationResult } from "./findings.js";
import {
  extractMarkdownDiagrams,
  projectEmbeddedEditSpan,
  projectEmbeddedSpan,
  type EmbeddedSpan,
  type ExtractedDiagram,
  type HostSpan,
} from "./markdown/index.js";
import {
  builtInRuleRegistry,
  materializeRuleConfigurationWithRegistry,
  runRules,
  type ExecutedRuleFinding,
  type RuleRegistry,
} from "./rules/index.js";
import { sourceLocationToSpan } from "./source-offsets.js";
import { helpForSyntaxError } from "./syntax-help.js";

export interface ValidationDependencies {
  readonly checkSyntax: typeof checkCanonicalSyntax;
  readonly extractMarkdown: typeof extractMarkdownDiagrams;
  readonly projectSpan: typeof projectEmbeddedSpan;
  readonly projectEditSpan?: typeof projectEmbeddedEditSpan;
  readonly ruleRegistry?: RuleRegistry;
}

const DEFAULT_DEPENDENCIES: Required<ValidationDependencies> = {
  checkSyntax: checkCanonicalSyntax,
  extractMarkdown: extractMarkdownDiagrams,
  projectSpan: projectEmbeddedSpan,
  projectEditSpan: projectEmbeddedEditSpan,
  ruleRegistry: builtInRuleRegistry,
};

const MARKDOWN_MAPPING_FAILURE_MESSAGE = "Unable to map Mermaid diagram offsets to Markdown";
const FAILURE_CODES = {
  initialization: "system/parser-initialization-failed", timeout: "system/parser-timeout",
  "restart-suppressed": "system/parser-restart-suppressed",
  runtime: "system/parser-runtime-failed", crash: "system/parser-crashed", protocol: "system/parser-protocol-error",
} as const satisfies Readonly<Record<string, BuiltInFindingCode>>;

function result(document: DocumentSnapshot, diagramCount: number, findings: readonly Finding[]): ValidationResult {
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
    const span = outcome.location ? sourceLocationToSpan(source, outcome.location) : undefined;
    const help = helpForSyntaxError({
      source,
      ...(outcome.diagramType === undefined ? {} : { diagramType: outcome.diagramType }),
      ...(outcome.location?.line === undefined ? {} : { line: outcome.location.line }),
    });
    return {
      code: "mermaid/syntax-error", severity: "error", message: outcome.message, source: "mermaid",
      ...(span === undefined ? {} : { span }),
      locationPrecision: span === undefined ? "document" : outcome.locationPrecision,
      ...(outcome.diagramType === undefined ? {} : { diagramType: outcome.diagramType }),
      engine: { name: "mermaid", version: outcome.engineVersion },
      ...(help === undefined ? {} : { help }),
    };
  }
  if (outcome.kind === "unsupported-type") {
    return {
      code: "mermaid/unsupported-diagram-type", severity: "error", message: outcome.message, source: "mermaid",
      locationPrecision: "document", diagramType: outcome.diagramType,
      engine: { name: "mermaid", version: outcome.engineVersion },
    };
  }
  return {
    code: FAILURE_CODES[outcome.failure], severity: "error", message: outcome.message,
    source: "system", locationPrecision: "document",
  };
}

export function resultFromSyntaxOutcome(document: DocumentSnapshot, outcome: SyntaxOutcome): ValidationResult {
  const finding = findingFromSyntaxOutcome(document.text, outcome);
  return result(document, 1, finding === undefined ? [] : [finding]);
}

function extractionFailure(document: DocumentSnapshot, message: string): ValidationResult {
  return result(document, 0, [{
    code: "system/markdown-extraction-failed", severity: "error", message, source: "system",
    span: { startOffset: 0, endOffset: document.text.length }, locationPrecision: "document",
  }]);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  throw error;
}

function isHostBoundedSpan(span: HostSpan, hostLength: number): boolean {
  return Number.isSafeInteger(span.startOffset) && Number.isSafeInteger(span.endOffset)
    && span.startOffset >= 0 && span.endOffset >= span.startOffset && span.endOffset <= hostLength;
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
  } catch { return undefined; }
}

function mapEmbeddedFinding(
  diagram: ExtractedDiagram,
  finding: Finding,
  dependencies: Required<ValidationDependencies>,
  hostLength: number,
): Finding | undefined {
  const span = finding.span === undefined
    ? (isHostBoundedSpan(diagram.hostBodySpan, hostLength) ? diagram.hostBodySpan : undefined)
    : projectHostSpan(diagram, finding.span, dependencies.projectSpan, hostLength);
  if (span === undefined) return undefined;
  const fixes: TextEdit[] | undefined = finding.fixes?.flatMap((edit) => {
    try {
      const hostSpan = dependencies.projectEditSpan(diagram, edit.span);
      return hostSpan !== undefined && isHostBoundedSpan(hostSpan, hostLength)
        ? [{ span: { ...hostSpan }, newText: edit.newText }]
        : [];
    } catch { return []; }
  });
  return {
    ...finding,
    span: { ...span },
    ...(finding.span === undefined ? { locationPrecision: "approximate" as const } : {}),
    ...(fixes === undefined ? {} : { fixes }),
  };
}

function trustedDiagramType(outcome: SyntaxOutcome): string | undefined {
  if (outcome.kind === "accepted" || outcome.kind === "unsupported-type") return outcome.diagramType;
  if (outcome.kind === "syntax-error" && outcome.diagramType !== undefined) return outcome.diagramType;
  return undefined;
}

async function checkSyntax(source: string, signal: AbortSignal | undefined, dependency: typeof checkCanonicalSyntax) {
  try {
    return await dependency(source, signal === undefined ? {} : { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    return { kind: "engine-failure", failure: "protocol", message: "Canonical Mermaid parser protocol failed" } as const;
  }
}

async function findingsForDiagram(input: {
  readonly source: string;
  readonly document: DocumentSnapshot;
  readonly diagramIndex: number;
  readonly options: ValidateOptions;
  readonly dependencies: Required<ValidationDependencies>;
}): Promise<readonly Finding[]> {
  const outcome = await checkSyntax(input.source, input.options.signal, input.dependencies.checkSyntax);
  const canonical = findingFromSyntaxOutcome(input.source, outcome);
  const configuration = input.options.rules
    ?? materializeRuleConfigurationWithRegistry({}, input.dependencies.ruleRegistry);
  const diagramType = trustedDiagramType(outcome);
  const executed = await runRules({
    source: input.source,
    documentUri: input.document.uri,
    diagramIndex: input.diagramIndex,
    ...(diagramType === undefined ? {} : { diagramType }),
    syntaxValid: outcome.kind === "accepted" || outcome.kind === "unsupported-type",
    configuration,
    registry: input.dependencies.ruleRegistry,
    ...(input.options.signal === undefined ? {} : { signal: input.options.signal }),
  });
  const ruleFindings: Finding[] = executed.map((finding: ExecutedRuleFinding) => ({
    code: finding.code, severity: finding.severity, message: finding.message, source: finding.source,
    ...(finding.span === undefined ? {} : { span: { ...finding.span } }),
    locationPrecision: finding.span === undefined ? "document" : "exact",
    ...(diagramType === undefined ? {} : { diagramType }),
    ...(finding.help === undefined ? {} : { help: finding.help }),
    ...(finding.fixes === undefined ? {} : { fixes: finding.fixes.map((edit) => ({ span: { ...edit.span }, newText: edit.newText })) }),
  }));
  return canonical === undefined ? ruleFindings : [canonical, ...ruleFindings];
}

async function validateMarkdown(
  document: DocumentSnapshot,
  options: ValidateOptions,
  dependencies: Required<ValidationDependencies>,
): Promise<ValidationResult> {
  throwIfAborted(options.signal);
  const extraction = dependencies.extractMarkdown(document.text);
  if (extraction.kind === "failure") return extractionFailure(document, extraction.message);
  for (const diagram of extraction.diagrams) {
    if (!isHostBoundedSpan(diagram.hostBodySpan, document.text.length)
      || projectHostSpan(diagram, { startOffset: 0, endOffset: diagram.source.length }, dependencies.projectSpan,
        document.text.length) === undefined) return extractionFailure(document, MARKDOWN_MAPPING_FAILURE_MESSAGE);
  }
  const findings: Finding[] = [];
  for (const [diagramIndex, diagram] of extraction.diagrams.entries()) {
    throwIfAborted(options.signal);
    const relative = await findingsForDiagram({ source: diagram.source, document, diagramIndex, options, dependencies });
    for (const finding of relative) {
      const mapped = mapEmbeddedFinding(diagram, finding, dependencies, document.text.length);
      if (mapped === undefined) return extractionFailure(document, MARKDOWN_MAPPING_FAILURE_MESSAGE);
      findings.push(mapped);
    }
  }
  return result(document, extraction.diagrams.length, findings);
}

export async function validateDocumentWithDependencies(
  document: DocumentSnapshot,
  options: ValidateOptions = {},
  dependencies: ValidationDependencies = DEFAULT_DEPENDENCIES,
): Promise<ValidationResult> {
  const resolved: Required<ValidationDependencies> = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const mode = options.mode ?? "canonical";
  if (mode !== "canonical") throw new Error(`Unsupported validation mode: ${String(mode)}`);
  if (document.languageId === "markdown") return await validateMarkdown(document, options, resolved);
  const findings = await findingsForDiagram({ source: document.text, document, diagramIndex: 0, options, dependencies: resolved });
  return result(document, 1, findings);
}

export async function validateDocument(document: DocumentSnapshot, options: ValidateOptions = {}): Promise<ValidationResult> {
  return await validateDocumentWithDependencies(document, options);
}
