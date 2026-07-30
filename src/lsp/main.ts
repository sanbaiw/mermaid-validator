#!/usr/bin/env node

import { createConnection, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { resolveLspTransportArguments } from "./contracts.js";
import { createLanguageServer } from "./server.js";

function main(): void {
  const transport = resolveLspTransportArguments(process.argv.slice(2));
  if (!transport.ok) {
    process.stderr.write(`${transport.message}\n`);
    process.exitCode = 2;
    return;
  }
  const connection = createConnection(process.stdin, process.stdout);
  const documents = new TextDocuments(TextDocument);
  createLanguageServer(connection, documents).listen();
}

main();
