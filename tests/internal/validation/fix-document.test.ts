import { describe, expect, it } from "vitest";
import type { SyntaxOutcome } from "../../../src/validation/canonical-syntax/index.js";
import { planDocumentFixesWithValidator } from "../../../src/validation/fix-document.js";
import { extractMarkdownDiagrams, projectEmbeddedSpan } from "../../../src/validation/markdown/index.js";
import {
  createRuleRegistry,
  materializeRuleConfigurationWithRegistry,
  strictEmptyOptionsSchema,
  type RuleModule,
} from "../../../src/validation/rules/index.js";
import { validateDocumentWithDependencies } from "../../../src/validation/validate-document.js";

function replacingRule(id: string, from: string, to: string): RuleModule {
  return {
    id, defaultSeverity: "error", prerequisite: "text",
    optionsSchema: strictEmptyOptionsSchema, defaultOptions: {},
    async run({ source }) {
      const startOffset = source.indexOf(from);
      return startOffset < 0 ? [] : [{
        message: `Replace ${from}`,
        span: { startOffset, endOffset: startOffset + from.length },
        fixes: [{ span: { startOffset, endOffset: startOffset + from.length }, newText: to }],
      }];
    },
  };
}

function harness(rules: readonly RuleModule[], syntax: (source: string) => SyntaxOutcome = () => ({
  kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0",
})) {
  const registry = createRuleRegistry(rules);
  const options = { rules: materializeRuleConfigurationWithRegistry({}, registry) };
  const validate = async (document: Parameters<typeof validateDocumentWithDependencies>[0]) => (
    await validateDocumentWithDependencies(document, options, {
      checkSyntax: async (source) => syntax(source),
      extractMarkdown: extractMarkdownDiagrams,
      projectSpan: projectEmbeddedSpan,
      ruleRegistry: registry,
    })
  );
  return { options, validate };
}

describe("document fix safety", () => {
  const document = { uri: "file:///fix.mmd", languageId: "mermaid" as const, text: "flowchart LR\nA[alpha]\n" };

  it("rejects overlapping edits from separate Findings as a conflict", async () => {
    const { options, validate } = harness([
      replacingRule("example/first", "alpha", "one"),
      replacingRule("example/second", "alpha", "two"),
    ]);
    const plan = await planDocumentFixesWithValidator(document, options, validate);
    expect(plan).toMatchObject({
      status: "conflict", edits: [],
      failureResult: { findings: expect.arrayContaining([expect.objectContaining({ code: "system/fix-conflict" })]) },
    });
  });

  it("blocks a post-fix canonical regression", async () => {
    const { options, validate } = harness(
      [replacingRule("example/break-syntax", "alpha", "BAD")],
      (source) => source.includes("BAD")
        ? { kind: "syntax-error", message: "bad", locationPrecision: "document", engineVersion: "11.16.0" }
        : { kind: "accepted", diagramType: "flowchart", engineVersion: "11.16.0" },
    );
    const plan = await planDocumentFixesWithValidator(document, options, validate);
    expect(plan).toMatchObject({
      status: "unsafe", edits: [],
      failureResult: { findings: expect.arrayContaining([
        expect.objectContaining({ code: "system/fix-validation-failed" }),
      ]) },
    });
    expect(plan.output).toBeUndefined();
  });

  it("reruns the complete selection and rejects a cross-rule second edit", async () => {
    const { options, validate } = harness([
      replacingRule("example/alpha-to-beta", "alpha", "beta"),
      replacingRule("example/beta-to-gamma", "beta", "gamma"),
    ]);
    const plan = await planDocumentFixesWithValidator(document, options, validate);
    expect(plan).toMatchObject({
      status: "non-idempotent", edits: [],
      failureResult: { findings: expect.arrayContaining([
        expect.objectContaining({ code: "system/fix-non-idempotent" }),
      ]) },
    });
  });

  it("preserves an original syntax failure even when a text rule proposes an edit", async () => {
    const { options, validate } = harness(
      [replacingRule("example/text-fix", "alpha", "beta")],
      () => ({ kind: "syntax-error", message: "bad", locationPrecision: "document", engineVersion: "11.16.0" }),
    );
    const plan = await planDocumentFixesWithValidator(document, options, validate);
    expect(plan.status).toBe("unsafe");
    expect(plan.originalResult.findings.map(({ code }) => code)).toEqual([
      "mermaid/syntax-error", "example/text-fix",
    ]);
    expect(plan.failureResult).toBeUndefined();
  });
});
