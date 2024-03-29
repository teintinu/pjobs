/* eslint-disable import/extensions */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.test");

const moduleNameMapper = pathsToModuleNameMapper(compilerOptions.paths, {
  prefix: "<rootDir>/",
});

module.exports = {
  testTimeout: 15000,
  preset: "ts-jest",
  modulePathIgnorePatterns: ["dist"],
  testPathIgnorePatterns: ["node_modules", "dist"],
  testMatch: ["**/*.test.ts"],
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.test.json",
    },
  },
  moduleNameMapper,
  transform: {
    "^.+\\.tsx?$": [
      "esbuild-jest",
      {
        sourcemap: "inline",
        target: ["es6", "node12"],
        loaders: {
          ".spec.ts": "tsx",
          ".test.ts": "tsx",
          ".steps.ts": "tsx",
        },
      },
    ],
  },
  coverageReporters: ["text", "html", "lcov", "cobertura", "json-summary"],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 80,
      functions: 90,
      branches: 70,
    },
  },
};
