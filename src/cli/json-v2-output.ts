import type { Finding } from "../validation/index.js";
import type { CliInputError, ValidatedDocument } from "./contracts.js";

function projectFinding(finding: Finding): Record<string, unknown> {
  return {
    code: finding.code,
    severity: finding.severity,
    message: finding.message,
    source: finding.source,
    ...(finding.span === undefined ? {} : { span: finding.span }),
    locationPrecision: finding.locationPrecision,
    ...(finding.diagramType === undefined ? {} : { diagramType: finding.diagramType }),
    ...(finding.engine === undefined ? {} : { engine: finding.engine }),
    ...(finding.help === undefined ? {} : { help: finding.help }),
    ...(finding.fixes === undefined ? {} : { fixes: finding.fixes }),
  };
}

export function formatJsonV2(
  documents: readonly ValidatedDocument[],
  inputErrors: readonly CliInputError[],
  toolVersion: string,
): string {
  const complete = inputErrors.length === 0;
  const summary = {
    documents: documents.length,
    diagrams: 0,
    findings: 0,
    errors: 0,
    warnings: 0,
    infos: 0,
    inputErrors: inputErrors.length,
  };
  for (const { result } of documents) {
    summary.diagrams += result.diagramCount;
    for (const finding of result.findings) {
      summary.findings += 1;
      if (finding.severity === "error") summary.errors += 1;
      else if (finding.severity === "warning") summary.warnings += 1;
      else summary.infos += 1;
    }
  }
  return `${JSON.stringify({
    schemaVersion: 2,
    tool: { name: "mermaid-validator", version: toolVersion },
    complete,
    valid: complete && documents.every((item) => item.result.valid),
    inputErrors: [...inputErrors]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((error) => ({ code: error.code, path: error.path, message: error.message })),
    documents: documents.map(({ document, result, fix }) => ({
      uri: result.documentUri,
      languageId: document.languageId,
      diagramCount: result.diagramCount,
      ...(result.documentVersion === undefined ? {} : { version: result.documentVersion }),
      valid: result.valid,
      findings: result.findings.map(projectFinding),
      ...(fix === undefined ? {} : {
        fix: {
          status: fix.status,
          editCount: fix.plan.edits.length,
          edits: fix.plan.edits,
          ...(fix.status === "previewed" ? {
            output: fix.plan.output,
            proposedResult: fix.plan.proposedResult === undefined ? undefined : {
              uri: fix.plan.proposedResult.documentUri,
              diagramCount: fix.plan.proposedResult.diagramCount,
              ...(fix.plan.proposedResult.documentVersion === undefined
                ? {} : { version: fix.plan.proposedResult.documentVersion }),
              valid: fix.plan.proposedResult.valid,
              findings: fix.plan.proposedResult.findings.map(projectFinding),
            },
          } : {}),
        },
      }),
    })),
    summary,
  }, null, 2)}\n`;
}
