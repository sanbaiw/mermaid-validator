import { createConnection, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { createLanguageServer } from "../../../dist/lsp/server.js";

if (process.argv.length !== 3 || process.argv[2] !== "--stdio") {
  process.stderr.write("Usage: system-finding-server --stdio\n");
  process.exitCode = 2;
} else {
  const connection = createConnection(process.stdin, process.stdout);
  const documents = new TextDocuments(TextDocument);
  createLanguageServer(connection, documents, {
    validate: async (document) => ({
      documentUri: document.uri,
      ...(document.version === undefined ? {} : { documentVersion: document.version }),
      diagramCount: 1,
      valid: false,
      findings: [{
        code: "system/parser-runtime-failed",
        severity: "error",
        message: "Mermaid parser runtime failed",
        source: "system",
        locationPrecision: "document",
      }],
    }),
  }).listen();
}
