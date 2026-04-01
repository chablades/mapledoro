import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const config = [
  ...nextVitals,
  ...nextTypescript,
  sonarjs.configs.recommended,
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  {
    rules: {
      "sonarjs/todo-tag": "off",
    },
  },
];

export default config;
