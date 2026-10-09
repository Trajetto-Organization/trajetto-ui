import { configDefaults } from "vitest/config";
import { describe, expect, it } from "vitest";

import config from "../../vitest.config";

/**
 * Stryker leaves full copies of the repository under .stryker-tmp/sandbox-*.
 * Without the exclude, a plain `npx vitest run` also ran those stale copies
 * (seen in wave 4: 4 files ran instead of 2, one of them an outdated guard).
 */
describe("vitest.config.ts", () => {
  const exclude =
    (config as { test?: { exclude?: string[] } }).test?.exclude ?? [];

  it("keeps Vitest's default excludes (node_modules, dist, …)", () => {
    expect(exclude).toEqual(
      expect.arrayContaining([...configDefaults.exclude]),
    );
  });

  it("never collects the tests copied into Stryker's sandboxes", () => {
    expect(exclude).toContain(".stryker-tmp/**");
  });

  it("never collects the Playwright files of tests/E2E (named *.test.ts)", () => {
    // A plain `npx vitest run` loaded them and 14 failed with "Playwright
    // Test did not expect test.describe() to be called here".
    expect(exclude).toContain("tests/E2E/**");
  });
});
