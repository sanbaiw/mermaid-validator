import type { Finding, ValidationResult } from "../validation/index.js";

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

export function formatJsonV1(result: ValidationResult, toolVersion: string): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    tool: {
      name: "mermaid-diagram-validator",
      version: toolVersion,
    },
    document: {
      uri: result.documentUri,
      ...(result.documentVersion === undefined ? {} : { version: result.documentVersion }),
    },
    valid: result.valid,
    findings: result.findings.map(projectFinding),
  }, null, 2)}\n`;
}
