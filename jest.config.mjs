import nextJest from "next/jest.js";

// next/jest resolves the "@/*" alias for ordinary `import` statements via
// its own SWC transform, not via this file — confirmed directly with
// `jest --showConfig` (no "@/" entry shows up on its own). That transform
// never touches a plain runtime string like jest.mock("@/..."), so
// without the moduleNameMapper entry below, jest.mock() can locate a
// relatively-imported module but not an aliased one.
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
