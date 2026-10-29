import { configDefaults, defineConfig } from "vitest/config";

import base from "./vitest.config";

/**
 * The test set Stryker runs against each mutant (stryker.config.mjs): the
 * unit suite, or what MUTATION_TESTS (comma-separated globs) narrows it to —
 * which is how a smoke run on one file stays small.
 *
 * The default is a list of its own, not a string run through the same split:
 * `*.test.{ts,tsx}` has a comma, and splitting it left two globs that match
 * nothing, so a run without MUTATION_TESTS found no test at all.
 */
const UNIT_SUITE = [
  "tests/unitaires/**/*.test.ts",
  "tests/unitaires/**/*.test.tsx",
];

// Spread, not mergeConfig: mergeConfig concatenates arrays, so the base
// `include` would survive and the narrowing would do nothing.
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: process.env.MUTATION_TESTS
      ? process.env.MUTATION_TESTS.split(",")
      : UNIT_SUITE,
    exclude: base.test?.exclude ?? [
      ...configDefaults.exclude,
      ".stryker-tmp/**",
    ],
  },
});
