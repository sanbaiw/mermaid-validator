export const accepted = (requestId, diagramType = "flowchart") => ({
  type: "response",
  requestId,
  outcome: { kind: "accepted", diagramType, engineVersion: "11.16.0" },
});

export const runtimeFailure = (requestId) => ({
  type: "response",
  requestId,
  outcome: {
    kind: "engine-failure",
    failure: "runtime",
    message: "Canonical Mermaid parser failed while validating the document",
  },
});
