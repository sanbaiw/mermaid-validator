import { describe, expect, it } from "vitest";
import { scanMarkdownHeadingsInFlowchartLabels } from "../../../../src/validation/rules/builtins/no-markdown-heading-in-label.js";
import {
  applyEdits,
  createRuleRegistry,
  materializeRuleConfigurationWithRegistry,
  mergeRuleConfigurationPatches,
  normalizeEdits,
  positiveIntegerOptionsSchema,
  resolveRuleConfigurationPatchWithRegistry,
  runRules,
  strictEmptyOptionsSchema,
  type RuleModule,
} from "../../../../src/validation/rules/index.js";

const exampleRule: RuleModule<{ max: number }> = {
  id: "example/max-source-length",
  defaultSeverity: "off",
  prerequisite: "text",
  optionsSchema: positiveIntegerOptionsSchema("max"),
  defaultOptions: { max: 80 },
  async run({ source, options }) {
    return source.length > options.max ? [{ message: "Source is too long" }] : [];
  },
};

describe("private rule contracts", () => {
  it("registers an external-style async rule without a closed id union", async () => {
    const registry = createRuleRegistry([exampleRule]);
    const patch = resolveRuleConfigurationPatchWithRegistry({
      "example/max-source-length": ["error", { max: 3 }],
    }, registry);
    expect(patch).toMatchObject({ ok: true });
    if (!patch.ok) return;
    const findings = await runRules({
      source: "abcd", documentUri: "file:///example.mmd", diagramIndex: 0,
      syntaxValid: false, registry,
      configuration: materializeRuleConfigurationWithRegistry(patch.value, registry),
    });
    expect(findings).toEqual([{ code: "example/max-source-length", severity: "error", source: "rule", message: "Source is too long" }]);
  });

  it("rejects invalid, reserved, and duplicate ids and invalid defaults", () => {
    expect(() => createRuleRegistry([{ ...exampleRule, id: "bad" }])).toThrow(/Invalid rule id/);
    expect(() => createRuleRegistry([{ ...exampleRule, id: "system/custom" }])).toThrow(/Invalid rule id/);
    expect(() => createRuleRegistry([exampleRule, exampleRule])).toThrow(/Duplicate rule id/);
    expect(() => createRuleRegistry([{ ...exampleRule, defaultOptions: { max: 0 } }])).toThrow(/Invalid default options/);
  });

  it("keeps patches sparse and materializes defaults only after ordered merging", () => {
    const second: RuleModule<Record<string, never>> = {
      id: "example/empty", defaultSeverity: "warning", prerequisite: "text",
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {}, async run() { return []; },
    };
    const registry = createRuleRegistry([exampleRule, second]);
    const base = resolveRuleConfigurationPatchWithRegistry({ "example/max-source-length": ["error", { max: 5 }] }, registry);
    const override = resolveRuleConfigurationPatchWithRegistry({ "example/empty": "off" }, registry);
    if (!base.ok || !override.ok) throw new Error("fixture configuration failed");
    const resolved = materializeRuleConfigurationWithRegistry(
      mergeRuleConfigurationPatches(base.value, override.value), registry,
    );
    expect(resolved).toMatchObject({
      "example/max-source-length": { severity: "error", options: { max: 5 } },
      "example/empty": { severity: "off", options: {} },
    });
  });

  it("bounds option failures and rejects unknown rule settings", () => {
    const registry = createRuleRegistry([exampleRule]);
    expect(resolveRuleConfigurationPatchWithRegistry({
      "example/max-source-length": ["warning", { max: 0, secret: "detail" }],
    }, registry)).toMatchObject({ ok: false, message: expect.stringContaining("Invalid options") });
    expect(resolveRuleConfigurationPatchWithRegistry({ "other/rule": "warning" }, registry))
      .toEqual({ ok: false, message: "Unknown rule: other/rule" });
  });

  it("isolates runtime and protocol failures and continues registry order", async () => {
    const failing: RuleModule = {
      id: "example/failing", defaultSeverity: "error", prerequisite: "text",
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {}, async run() { throw new Error("private"); },
    };
    const malformed: RuleModule = {
      id: "example/malformed", defaultSeverity: "error", prerequisite: "text",
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {},
      async run() { return [{ message: "", span: { startOffset: -1, endOffset: 99 } }]; },
    };
    const registry = createRuleRegistry([failing, malformed]);
    const findings = await runRules({
      source: "x", documentUri: "file:///x.mmd", diagramIndex: 0, syntaxValid: false,
      registry, configuration: materializeRuleConfigurationWithRegistry({}, registry),
    });
    expect(findings.map(({ code, message }) => ({ code, message }))).toEqual([
      { code: "system/rule-runtime-failed", message: "Rule example/failing failed during execution" },
      { code: "system/rule-protocol-error", message: "Rule example/malformed returned an invalid report" },
    ]);
    expect(JSON.stringify(findings)).not.toContain("private");
  });

  it("rejects insertion fixes while allowing zero-width finding spans", async () => {
    const insertion: RuleModule = {
      id: "example/insertion", defaultSeverity: "error", prerequisite: "text",
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {},
      async run() {
        return [{
          message: "Insert text",
          fixes: [{ span: { startOffset: 1, endOffset: 1 }, newText: "new" }],
        }];
      },
    };
    const zeroWidthFinding: RuleModule = {
      id: "example/zero-width-finding", defaultSeverity: "warning", prerequisite: "text",
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {},
      async run() { return [{ message: "Point finding", span: { startOffset: 1, endOffset: 1 } }]; },
    };
    const registry = createRuleRegistry([insertion, zeroWidthFinding]);
    const findings = await runRules({
      source: "abc", documentUri: "file:///example.mmd", diagramIndex: 0, syntaxValid: false,
      registry, configuration: materializeRuleConfigurationWithRegistry({}, registry),
    });
    expect(findings).toEqual([
      {
        code: "system/rule-protocol-error", severity: "error", source: "system",
        message: "Rule example/insertion returned an invalid report",
      },
      {
        code: "example/zero-width-finding", severity: "warning", source: "rule",
        message: "Point finding", span: { startOffset: 1, endOffset: 1 },
      },
    ]);
  });

  it("gates syntax-valid rules before invocation for invalid or unavailable canonical outcomes", async () => {
    let calls = 0;
    const gated: RuleModule = {
      id: "example/gated", defaultSeverity: "warning", prerequisite: "syntax-valid", diagramTypes: ["flowchart"],
      optionsSchema: strictEmptyOptionsSchema, defaultOptions: {}, async run() { calls += 1; return []; },
    };
    const registry = createRuleRegistry([gated]);
    const configuration = materializeRuleConfigurationWithRegistry({}, registry);
    await runRules({
      source: "bad", documentUri: "file:///bad-flowchart.mmd", diagramIndex: 0,
      diagramType: "flowchart", syntaxValid: false, registry, configuration,
    });
    await runRules({
      source: "bad", documentUri: "file:///bad-sequence.mmd", diagramIndex: 0,
      diagramType: "sequence", syntaxValid: false, registry, configuration,
    });
    await runRules({
      source: "bad", documentUri: "file:///parser-failed.mmd", diagramIndex: 0,
      syntaxValid: false, registry, configuration,
    });
    expect(calls).toBe(0);
  });
});

describe("Flowchart Markdown heading scanner", () => {
  it("finds definite headings in legacy and modern node labels", () => {
    const source = [
      "flowchart LR",
      "A[\"`# Square`\"]",
      "B(\"`  ## Round`\")",
      "C{\"`### Brace`\"}",
      "D@{ shape: rect, label: \"`#### Modern`\" }",
    ].join("\n");
    const reports = scanMarkdownHeadingsInFlowchartLabels(source);
    expect(reports).toHaveLength(4);
    expect(applyEdits(source, reports.flatMap((report) => report.fixes ?? []))).toContain("`Square`");
  });

  it("ignores ambiguous and non-heading text while always making progress", () => {
    const source = [
      "flowchart LR", "A[\"plain # label\"]", "B[\"`\\# Escaped`\"]", "C[\"`#nospace`\"]",
      "D[\"`####### Seven`\"]", "E[\"`    # Four spaces`\"]", "F-->|\"`# Edge`\"|G",
      "%% H[\"`# Comment`\"]", "I[\"`# Unterminated",
    ].join("\n");
    expect(scanMarkdownHeadingsInFlowchartLabels(source)).toEqual([]);
    expect(scanMarkdownHeadingsInFlowchartLabels("\"`".repeat(2_000))).toEqual([]);
  });
});

describe("safe edit normalization", () => {
  it("orders and applies non-overlapping edits without normalizing source", () => {
    const normalized = normalizeEdits([
      { span: { startOffset: 3, endOffset: 4 }, newText: "B" },
      { span: { startOffset: 0, endOffset: 1 }, newText: "A" },
    ], 4);
    expect(normalized).toMatchObject({ ok: true });
    if (normalized.ok) expect(applyEdits("x\r\ny", normalized.edits)).toBe("A\r\nB");
  });

  it("rejects overlap, insertion edits, and invalid bounds", () => {
    expect(normalizeEdits([
      { span: { startOffset: 0, endOffset: 2 }, newText: "" },
      { span: { startOffset: 1, endOffset: 3 }, newText: "" },
    ], 3)).toEqual({ ok: false, reason: "conflict" });
    expect(normalizeEdits([
      { span: { startOffset: 1, endOffset: 1 }, newText: "a" },
    ], 3)).toEqual({ ok: false, reason: "invalid" });
    expect(normalizeEdits([{ span: { startOffset: -1, endOffset: 0 }, newText: "" }], 3))
      .toEqual({ ok: false, reason: "invalid" });
  });
});
