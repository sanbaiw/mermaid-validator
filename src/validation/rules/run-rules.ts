import type {
  ExecutedRuleFinding,
  ResolvedRuleConfiguration,
  RuleRegistry,
  RuleReport,
  RuleTextEdit,
  RuleTextSpan,
} from "./contracts.js";

const MAX_MESSAGE_LENGTH = 500;

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  throw error;
}

function isSpan(value: unknown, length: number): value is RuleTextSpan {
  if (typeof value !== "object" || value === null) return false;
  const { startOffset, endOffset } = value as Record<string, unknown>;
  return Number.isSafeInteger(startOffset) && Number.isSafeInteger(endOffset)
    && (startOffset as number) >= 0 && (endOffset as number) >= (startOffset as number)
    && (endOffset as number) <= length;
}

function isEdit(value: unknown, length: number): value is RuleTextEdit {
  if (typeof value !== "object" || value === null
    || typeof (value as { newText?: unknown }).newText !== "string") return false;
  const span = (value as { span?: unknown }).span;
  return isSpan(span, length) && span.endOffset > span.startOffset;
}

function validReport(report: unknown, length: number): report is RuleReport {
  if (typeof report !== "object" || report === null) return false;
  const value = report as Record<string, unknown>;
  if (typeof value.message !== "string" || value.message.trim().length === 0
    || value.message.length > MAX_MESSAGE_LENGTH) return false;
  if (value.help !== undefined && (typeof value.help !== "string" || value.help.length > MAX_MESSAGE_LENGTH)) return false;
  if (value.span !== undefined && !isSpan(value.span, length)) return false;
  return value.fixes === undefined || (Array.isArray(value.fixes) && value.fixes.every((edit) => isEdit(edit, length)));
}

export async function runRules(input: {
  readonly source: string;
  readonly documentUri: string;
  readonly diagramIndex: number;
  readonly diagramType?: string;
  readonly syntaxValid: boolean;
  readonly configuration: ResolvedRuleConfiguration;
  readonly registry: RuleRegistry;
  readonly signal?: AbortSignal;
}): Promise<readonly ExecutedRuleFinding[]> {
  const findings: ExecutedRuleFinding[] = [];
  for (const module of input.registry.modules) {
    const setting = input.configuration[module.id];
    if (!setting || setting.severity === "off") continue;
    if (input.diagramType !== undefined && module.diagramTypes !== undefined
      && !module.diagramTypes.includes(input.diagramType)) continue;
    if (module.prerequisite === "syntax-valid" && !input.syntaxValid) continue;
    if (input.diagramType === undefined && module.diagramTypes !== undefined && input.syntaxValid) continue;
    throwIfAborted(input.signal);
    let reports: readonly RuleReport[];
    try {
      reports = await module.run({
        source: input.source,
        documentUri: input.documentUri,
        diagramIndex: input.diagramIndex,
        ...(input.diagramType === undefined ? {} : { diagramType: input.diagramType }),
        options: setting.options,
        ...(input.signal === undefined ? {} : { signal: input.signal }),
      }) as readonly RuleReport[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      findings.push({
        code: "system/rule-runtime-failed", severity: "error", source: "system",
        message: `Rule ${module.id} failed during execution`,
      });
      continue;
    }
    throwIfAborted(input.signal);
    if (!Array.isArray(reports) || reports.some((report) => !validReport(report, input.source.length))) {
      findings.push({
        code: "system/rule-protocol-error", severity: "error", source: "system",
        message: `Rule ${module.id} returned an invalid report`,
      });
      continue;
    }
    for (const report of reports) {
      findings.push({
        code: module.id,
        severity: setting.severity,
        source: "rule",
        message: report.message,
        ...(report.span === undefined ? {} : { span: { ...report.span } }),
        ...(report.help === undefined ? {} : { help: report.help }),
        ...(report.fixes === undefined ? {} : {
          fixes: report.fixes.map((edit: RuleTextEdit) => ({ span: { ...edit.span }, newText: edit.newText })),
        }),
      });
    }
  }
  return findings;
}
