import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const config = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  sonarjs.configs.recommended,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    settings: {
      // Fix for ESLint 10+: eslint-plugin-react uses context.getFilename() (legacy API)
      // which was removed in ESLint 10 flat config. Declaring the version explicitly
      // prevents the plugin from trying to auto-detect it and failing.
      react: { version: "19" },
    },
  },
]);

export default config;
