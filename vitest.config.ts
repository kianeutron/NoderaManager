import { defineConfig } from "vitest/config";
import path from "node:path";

const integrationTests = "src/**/*.integration.test.ts";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts", "src/**/*.test.tsx"], exclude: [integrationTests] } },
      // Integration suites share one database, so their files must not run concurrently.
      { extends: true, test: { name: "integration", include: [integrationTests], fileParallelism: false } }
    ]
  }
});
