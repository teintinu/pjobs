module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  extends: [
    "airbnb-base",
    "plugin:prettier/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.eslint.json"],
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "import/no-unresolved": "off",
    "import/prefer-default-export": "off",
    "@typescript-eslint/unbound-method": "off",
    "import/extensions": "off",
    "no-use-before-define": "off",
    "no-plusplus": "off",
    "no-void": "off",
    "no-loop-func": "off",
    "no-return-awaits": "off",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
