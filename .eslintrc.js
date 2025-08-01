module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["import", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "no-console": "off",
    "import/order": [
      "warn",
      {
        groups: [
          ["builtin", "external"],
          "internal",
          ["parent", "sibling", "index"],
        ],
        "newlines-between": "always",
      },
    ],
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
};
