import { describe, expect, it } from "vitest";
import { runCli, type CliDependencies } from "../../../src/cli/main.js";
import type { ValidationResult } from "../../../src/validation/index.js";

function writer(onWrite: (text: string) => void): Pick<NodeJS.WriteStream, "write"> {
  return { write: ((text: string) => { onWrite(text); return true; }) as NodeJS.WriteStream["write"] };
}

async function invoke(result: ValidationResult): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = "";
  let stderr = "";
  const dependencies: Partial<CliDependencies> = {
    readFile: (async () => "flowchart TD") as unknown as CliDependencies["readFile"],
    validate: async () => result,
    stdout: writer((text) => { stdout += text; }),
    stderr: writer((text) => { stderr += text; }),
  };
  return { code: await runCli(["diagram.mmd"], dependencies), stdout, stderr };
}

const result = (findings: ValidationResult["findings"]): ValidationResult => ({
  documentUri: "file:///diagram.mmd",
  valid: !findings.some((finding) => finding.severity === "error"),
  findings,
});

describe("runCli exit mapping", () => {
  it("gives system errors precedence", async () => {
    const invocation = await invoke(result([
      { code: "rule/example", severity: "error", message: "rule", source: "rule", locationPrecision: "document" },
      { code: "system/parser-timeout", severity: "error", message: "timeout", source: "system", locationPrecision: "document" },
    ]));
    expect(invocation.code).toBe(3);
    expect(invocation.stderr).toBe("");
  });

  it("maps future rule errors to 1 and warning-only results to 0", async () => {
    await expect(invoke(result([
      { code: "rule/example", severity: "error", message: "rule", source: "rule", locationPrecision: "document" },
    ]))).resolves.toMatchObject({ code: 1 });
    await expect(invoke(result([
      { code: "rule/warning", severity: "warning", message: "warning", source: "rule", locationPrecision: "document" },
    ]))).resolves.toMatchObject({ code: 0 });
  });
});
