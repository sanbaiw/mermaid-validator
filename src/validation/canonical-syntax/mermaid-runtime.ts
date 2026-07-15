import { JSDOM } from "jsdom";
import { normalizeMermaidError } from "./normalize-mermaid-error.js";
import type { SyntaxOutcome, TargetDiagramType } from "./protocol.js";

const ENGINE_VERSION = "11.16.0";
const PROFILE = {
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true,
} as const;

const TARGET_TYPE_ALIASES = {
  graph: "flowchart",
  flowchart: "flowchart",
  "flowchart-v2": "flowchart",
  sequence: "sequence",
  sequenceDiagram: "sequence",
  pie: "pie",
  class: "class",
  classDiagram: "class",
  state: "state",
  stateDiagram: "state",
  "stateDiagram-v2": "state",
} as const satisfies Readonly<Record<string, TargetDiagramType>>;
const targetTypeFor = (rawType: string): TargetDiagramType | undefined =>
  (TARGET_TYPE_ALIASES as Readonly<Record<string, TargetDiagramType>>)[rawType];

let mermaidPromise: Promise<(typeof import("mermaid"))["default"]> | undefined;

function installDomGlobals(): void {
  if (globalThis.window) return;
  const { window } = new JSDOM("");
  for (const [name, value] of Object.entries({
    window,
    document: window.document,
    navigator: window.navigator,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Option: window.Option,
    DOMParser: window.DOMParser,
  })) {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
}

async function loadMermaid(): Promise<(typeof import("mermaid"))["default"]> {
  installDomGlobals();
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize(PROFILE);
  return mermaid;
}

export async function initializeMermaidRuntime(): Promise<void> {
  mermaidPromise ??= loadMermaid();
  await mermaidPromise;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function parseCanonicalSyntax(source: string): Promise<SyntaxOutcome> {
  mermaidPromise ??= loadMermaid();
  const mermaid = await mermaidPromise;
  let detectedType: string | undefined;
  try {
    detectedType = nonEmptyString(mermaid.detectType(source));
  } catch {
    // Official parse below remains the canonical syntax verdict.
  }

  let result: unknown;
  try {
    result = await mermaid.parse(source, { suppressErrors: false });
  } catch (error) {
    const normalizedDetected = detectedType === undefined ? undefined : targetTypeFor(detectedType);
    return normalizeMermaidError(error, ENGINE_VERSION, normalizedDetected);
  }

  const parsedType = result && typeof result === "object"
    ? nonEmptyString((result as Record<string, unknown>).diagramType)
    : undefined;
  const rawType = parsedType ?? detectedType;
  if (rawType === undefined) {
    return {
      kind: "engine-failure",
      failure: "protocol",
      message: "Canonical Mermaid parser returned no diagram type",
    };
  }
  const targetType = targetTypeFor(rawType);
  if (targetType !== undefined) {
    return { kind: "accepted", diagramType: targetType, engineVersion: ENGINE_VERSION };
  }
  return {
    kind: "unsupported-type",
    diagramType: rawType,
    message: `Mermaid diagram type "${rawType}" is not supported`,
    engineVersion: ENGINE_VERSION,
  };
}
