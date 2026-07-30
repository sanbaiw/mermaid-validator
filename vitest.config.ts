import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 20_000,
    include: ["tests/**/*.test.ts"],
    // Canonical, CLI, and LSP suites create nested Node processes, so serialize test files.
    fileParallelism: false,
    sequence: { concurrent: false },
    snapshotFormat: {
      escapeString: false,
      printBasicPrototype: false,
    },
  },
});
