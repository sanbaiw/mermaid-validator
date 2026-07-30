import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEBOUNCE_MS,
  resolveLspInitializationOptions,
  resolveLspTransportArguments,
} from "../../../src/lsp/contracts.js";

describe("LSP private contracts", () => {
  it.each([undefined, null])("uses defaults for %s initialization options", (input) => {
    const resolved = resolveLspInitializationOptions(input);
    expect(resolved).toMatchObject({
      ok: true,
      value: {
        debounceMs: DEFAULT_DEBOUNCE_MS,
        rules: {
          "flowchart/no-markdown-heading-in-label": { severity: "warning", options: {} },
        },
      },
    });
  });

  it("resolves a strict debounce and base rule patch", () => {
    expect(resolveLspInitializationOptions({
      debounceMs: 0,
      rules: { "flowchart/no-markdown-heading-in-label": ["error", {}] },
    })).toMatchObject({
      ok: true,
      value: {
        debounceMs: 0,
        rules: { "flowchart/no-markdown-heading-in-label": { severity: "error", options: {} } },
      },
    });
  });

  it.each([
    [],
    "invalid",
    { extra: true },
    { debounceMs: -1 },
    { debounceMs: 2_001 },
    { debounceMs: 1.5 },
    { debounceMs: null },
    { rules: [] },
    { rules: null },
    { rules: { unknown: "warning" } },
    { rules: { "flowchart/no-markdown-heading-in-label": ["warning", { extra: true }] } },
  ])("rejects invalid initialization options %j", (input) => {
    const resolved = resolveLspInitializationOptions(input);
    expect(resolved.ok).toBe(false);
    if (resolved.ok) throw new Error("Expected failure");
    expect(resolved.message.length).toBeGreaterThan(0);
    expect(resolved.message.length).toBeLessThan(200);
  });

  it("bounds attacker-controlled initialization errors", () => {
    const longName = "x".repeat(100_000);
    for (const input of [
      { [longName]: true },
      { rules: { [longName]: "warning" } },
    ]) {
      const resolved = resolveLspInitializationOptions(input);
      expect(resolved.ok).toBe(false);
      if (resolved.ok) throw new Error("Expected failure");
      expect(resolved.message.length).toBeLessThanOrEqual(256);
    }
  });

  it("accepts only the exact stdio transport invocation", () => {
    expect(resolveLspTransportArguments(["--stdio"])).toEqual({ ok: true });
    for (const arguments_ of [[], ["--stdio", "--stdio"], ["--socket=1234"], ["--stdio", "extra"]]) {
      expect(resolveLspTransportArguments(arguments_)).toEqual({
        ok: false,
        message: "Usage: mermaid-validator-language-server --stdio",
      });
    }
  });
});
