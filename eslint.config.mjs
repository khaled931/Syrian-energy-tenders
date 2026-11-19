import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  // TypeScript rules belong to typed sources; the cloud-test harness is CommonJS.
  { files: ["**/*.{ts,tsx}"], extends: nextTypescript },
  {
    files: ["**/*.{cjs,mjs}"],
    languageOptions: {
      globals: { require: "readonly", module: "readonly", __dirname: "readonly", process: "readonly", Buffer: "readonly", console: "readonly", Blob: "readonly", Request: "readonly", ReadableStream: "readonly", TextEncoder: "readonly" },
    },
    rules: { "no-unused-vars": "error", "no-undef": "error" },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
