import globals from "globals";
import pluginJs from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      parser: parser,
      globals: globals.browser, // Directly using the browser globals
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
    },
  },
];
