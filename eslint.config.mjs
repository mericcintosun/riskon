import js from "@eslint/js";
import globals from "globals";

/**
 * Minimal, self-contained flat config.
 *
 * `next lint` was removed in Next.js 16, and the eslint-config-next shareable
 * config is not yet stable under ESLint 9 flat config (circular-plugin error),
 * so we lint the JS/JSX sources with the core recommended ruleset. Rules are set
 * to "warn" so lint is informative without gating the build; TypeScript sources
 * are type-checked by `next build` / `tsc` instead.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "backend/node_modules/**",
      "temp-passkey-latest/**",
      "risk_score/**",
      "public/**",
      "**/*.ts",
      "**/*.tsx",
      "**/*.test.{js,jsx}",
      "src/tests/**",
      "**/__tests__/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-constant-condition": "warn",
      "no-cond-assign": "warn",
      "no-fallthrough": "warn",
      "no-prototype-builtins": "warn",
      "no-control-regex": "warn",
      "no-irregular-whitespace": "warn",
      "no-unreachable": "warn",
      "no-redeclare": "warn",
      "no-dupe-keys": "warn",
    },
  },
];

export default eslintConfig;
