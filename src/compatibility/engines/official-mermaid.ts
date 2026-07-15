import { JSDOM } from "jsdom";
import type { CompatibilityAdapter, EngineObservation } from "../contracts.js";
import { normalizeDiagramType, rejectedObservation } from "../normalize.js";
import { ENGINE_VERSIONS } from "../versions.js";

const VERSION = ENGINE_VERSIONS["official-mermaid"];
const PROFILE = {
  startOnLoad: false,
  securityLevel: "strict",
  suppressErrorRendering: true,
} as const;

let mermaidPromise: Promise<(typeof import("mermaid"))["default"]> | undefined;

function installDomGlobals(): void {
  if (globalThis.window) return;
  const { window } = new JSDOM("");
  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    SVGElement: window.SVGElement,
    Option: window.Option,
    DOMParser: window.DOMParser,
  };
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: true,
      writable: true,
    });
  }
}

async function loadMermaid(): Promise<(typeof import("mermaid"))["default"]> {
  installDomGlobals();
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize(PROFILE);
  return mermaid;
}

async function getMermaid(): Promise<(typeof import("mermaid"))["default"]> {
  mermaidPromise ??= loadMermaid();
  return mermaidPromise;
}

export const officialMermaidProfile = PROFILE;

export const officialMermaidAdapter: CompatibilityAdapter = {
  id: "official-mermaid",
  version: VERSION,
  async observe(fixture): Promise<EngineObservation> {
    const mermaid = await getMermaid();
    let rawDiagramType: string | undefined;
    try {
      rawDiagramType = mermaid.detectType(fixture.source);
    } catch {
      // Parsing below remains the canonical verdict for malformed headers.
    }
    try {
      await mermaid.parse(fixture.source, { suppressErrors: false });
      const diagramType = normalizeDiagramType(rawDiagramType);
      return {
        fixtureId: fixture.id,
        engine: this.id,
        engineVersion: this.version,
        verdict: "accepted",
        ...(rawDiagramType === undefined ? {} : { rawDiagramType }),
        ...(diagramType === undefined ? {} : { diagramType }),
        locationPrecision: "document",
      };
    } catch (error) {
      return rejectedObservation(fixture, this.id, this.version, error, rawDiagramType);
    }
  },
};
