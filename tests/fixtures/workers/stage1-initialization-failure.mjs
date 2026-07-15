process.stderr.write("PRIVATE_INIT_DETAIL");
process.send?.({ type: "initialization-failed", message: "Canonical Mermaid parser failed to initialize" });
process.exitCode = 1;
