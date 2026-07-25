import { describe, expect, it } from "vitest";
import {
  materializeRuleConfiguration,
  planDocumentFixes,
  resolveRuleConfigurationPatch,
  validateDocument,
} from "../../../src/validation/index.js";

function configured(input: unknown) {
  const patch = resolveRuleConfigurationPatch(input);
  if (!patch.ok) throw new Error(patch.message);
  return materializeRuleConfiguration(patch.value);
}

describe("Stage 3 rule and fix contract", () => {
  const source = "flowchart LR\n  A[\"`# Build`\"]\n";

  it("reports the built-in warning by default and supports error/off severity", async () => {
    const document = { uri: "file:///heading.mmd", languageId: "mermaid" as const, text: source };
    await expect(validateDocument(document)).resolves.toMatchObject({
      valid: true,
      findings: [{
        code: "flowchart/no-markdown-heading-in-label", severity: "warning", source: "rule",
        fixes: [{ span: expect.any(Object), newText: "" }],
      }],
    });
    await expect(validateDocument(document, { rules: configured({
      "flowchart/no-markdown-heading-in-label": "error",
    }) })).resolves.toMatchObject({ valid: false, findings: [{ severity: "error" }] });
    await expect(validateDocument(document, { rules: configured({
      "flowchart/no-markdown-heading-in-label": "off",
    }) })).resolves.toMatchObject({ valid: true, findings: [] });
  });

  it("projects a Markdown edit only onto copied host text", async () => {
    const text = "> ```mermaid\n> flowchart LR\n>   A[\"`# Build`\"]\n> ```\n";
    const result = await validateDocument({ uri: "file:///guide.md", languageId: "markdown", text });
    const edit = result.findings[0]?.fixes?.[0];
    expect(edit).toBeDefined();
    expect(text.slice(edit!.span.startOffset, edit!.span.endOffset)).toBe("# ");
  });

  it.each([
    ["square", "flowchart LR\nA[\"`# Square`\"]\n"],
    ["rounded", "flowchart LR\nA(\"`## Rounded`\")\n"],
    ["ellipse", "flowchart LR\nA(-\"`### Ellipse`\"-)\n"],
    ["stadium", "flowchart LR\nA([\"`### Stadium`\"])\n"],
    ["subroutine", "flowchart LR\nA[[\"`#### Subroutine`\"]]\n"],
    ["cylinder", "flowchart LR\nA[(\"`##### Cylinder`\")]\n"],
    ["circle", "flowchart LR\nA((\"`# Circle`\"))\n"],
    ["double-circle", "flowchart LR\nA(((\"`## Double circle`\")))\n"],
    ["brace", "flowchart LR\nA{\"`### Brace`\"}\n"],
    ["hexagon", "flowchart LR\nA{{\"`#### Hexagon`\"}}\n"],
    ["asymmetric", "flowchart LR\nA>\"`# Asymmetric`\"]\n"],
    ["parallelogram", "flowchart LR\nA[/\"`## Parallelogram`\"/]\n"],
    ["trapezoid", "flowchart LR\nA[/\"`### Trapezoid`\"\\]\n"],
    ["lean-left", "flowchart LR\nA[\\\"`#### Lean left`\"\\]\n"],
    ["inverse-trapezoid", "flowchart LR\nA[\\\"`##### Inverse trapezoid`\"/]\n"],
    ["modern", "flowchart LR\nA@{ shape: rect, label: \"`##### Modern`\" }\n"],
  ])("uses official Mermaid to accept and report the %s node-label form", async (_name, text) => {
    const result = await validateDocument({ uri: "file:///shape.mmd", languageId: "mermaid", text });
    expect(result.findings).toEqual([expect.objectContaining({
      code: "flowchart/no-markdown-heading-in-label", fixes: [expect.objectContaining({ newText: "" })],
    })]);
  });

  it("does not treat accepted subgraph titles or edge labels as node labels", async () => {
    const text = [
      "flowchart LR",
      "subgraph S[\"`# Group`\"]",
      "  A",
      "end",
      "A -->|\"`# Edge`\"| B",
    ].join("\n");
    const result = await validateDocument({ uri: "file:///non-node-labels.mmd", languageId: "mermaid", text });
    expect(result.valid).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("does not treat accepted modern edge metadata as node metadata", async () => {
    const text = [
      "flowchart LR",
      "A e1@--> B",
      "e1@{ label: \"`# Edge metadata`\", animate: true }",
    ].join("\n");
    const result = await validateDocument({ uri: "file:///edge-metadata.mmd", languageId: "mermaid", text });
    expect(result.valid).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("plans, revalidates, and proves an idempotent in-memory fix", async () => {
    const document = { uri: "file:///heading.mmd", languageId: "mermaid" as const, text: source, version: 4 };
    const plan = await planDocumentFixes(document);
    expect(plan).toMatchObject({
      status: "changed", output: "flowchart LR\n  A[\"`Build`\"]\n",
      originalResult: { findings: [{ severity: "warning" }] },
      proposedResult: { documentVersion: 4, valid: true, findings: [] },
    });
    await expect(planDocumentFixes({ ...document, text: plan.output! })).resolves.toMatchObject({ status: "unchanged" });
  });

  it("preserves an original syntax error and its exit class without manufacturing a fix failure", async () => {
    const document = { uri: "file:///invalid.mmd", languageId: "mermaid" as const, text: "flowchart LR\nA -x-> B\n" };
    const plan = await planDocumentFixes(document);
    expect(plan.status).toBe("unsafe");
    expect(plan.failureResult).toBeUndefined();
    expect(plan.originalResult.findings).toEqual([expect.objectContaining({ code: "mermaid/syntax-error" })]);
  });
});
