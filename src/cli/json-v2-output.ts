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
  };
}

export function formatJsonV2(
  documents: readonly ValidatedDocument[],
  inputErrors: readonly CliInputError[],
  toolVersion: string,
): string {
  const findings = documents.flatMap((item) => item.result.findings);
  const complete = inputErrors.length === 0;
  return `${JSON.stringify({
    schemaVersion: 2,
    tool: { name: "mermaid-diagram-validator", version: toolVersion },
    complete,
    valid: complete && documents.every((item) => item.result.valid),
    inputErrors: [...inputErrors]
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((error) => ({ code: error.code, path: error.path, message: error.message })),
    documents: documents.map(({ document, result }) => ({
      uri: result.documentUri,
      languageId: document.languageId,
      diagramCount: result.diagramCount,
      ...(result.documentVersion === undefined ? {} : { version: result.documentVersion }),
      valid: result.valid,
      findings: result.findings.map(projectFinding),
    })),
    summary: {
      documents: documents.length,
      diagrams: documents.reduce((total, item) => total + item.result.diagramCount, 0),
      findings: findings.length,
      errors: findings.filter((finding) => finding.severity === "error").length,
      warnings: findings.filter((finding) => finding.severity === "warning").length,
      infos: findings.filter((finding) => finding.severity === "info").length,
      inputErrors: inputErrors.length,
    },
  }, null, 2)}\n`;
}
