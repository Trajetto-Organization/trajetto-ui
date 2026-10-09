// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
  coverageConfigDefaults,
  defaultExclude,
  defaultInclude,
} from "vitest/config";

import config from "../../vitest.config";

/**
 * Coverage measured for real on the web too (decision 13.1, TEST-COV-2), as
 * in the API and the app: the branch CI runs the unit tests with coverage and
 * publishes the report. Before this the web had no coverage provider at all,
 * so no number about it could be anything but a guess.
 *
 * "For real" means every file of product code under src counts — the pages
 * and components no unit test renders included — and nothing is carved out.
 */
const ROOT = resolve(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

// Every .ts/.tsx under src except declaration files (type-only, no code).
const productFiles = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return productFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
      ? [path]
      : [];
  });

// The filter the v8 provider itself applies (@vitest/coverage-v8 1.6,
// provider.js): test-exclude over Vitest's defaults plus the coverage exclude
// (Vitest's coverage defaults when the config sets none).
const coverageFilter = (coverage: Coverage) => {
  const providerRequire = createRequire(
    createRequire(join(ROOT, "package.json")).resolve("@vitest/coverage-v8"),
  );
  const TestExclude = providerRequire("test-exclude");
  return new TestExclude({
    cwd: ROOT,
    include: coverage.include,
    exclude: [
      ...defaultExclude,
      ...defaultInclude,
      ...(coverage.exclude ?? coverageConfigDefaults.exclude),
    ],
    excludeNodeModules: true,
    relativePath: true,
  }) as { shouldInstrument: (file: string) => boolean };
};

type Coverage = {
  provider?: string;
  all?: boolean;
  include?: string[];
  exclude?: string[];
  reportOnFailure?: boolean;
};

describe("unit test coverage", () => {
  it("uses the v8 provider of the SAME vitest version", () => {
    const { devDependencies } = JSON.parse(read("package.json"));

    // Pinned exactly: @vitest/coverage-v8 has vitest as an exact peer.
    expect(devDependencies["@vitest/coverage-v8"]).toBe(devDependencies.vitest);

    const load = createRequire(join(ROOT, "package.json"));
    expect(load("@vitest/coverage-v8/package.json").version).toBe(
      load("vitest/package.json").version,
    );
  });

  it("measures every product file under src, and nothing is carved out", () => {
    const coverage = (config.test?.coverage ?? {}) as Coverage;

    expect(coverage.provider).toBe("v8");
    expect(coverage.all).toBe(true);
    expect(coverage.include).toEqual(["src/**/*.{ts,tsx}"]);
    expect(coverage.reportOnFailure).toBe(true);
  });

  it("does not drop a product file whose name merely ends in -spec or -test", () => {
    const coverage = (config.test?.coverage ?? {}) as Coverage;
    const filter = coverageFilter(coverage);
    const files = productFiles("src");

    // Vitest's default glob `*{.,-}{test,spec}.*` silently hid these two.
    expect(files).toContain("src/app/docs/_lib/public-spec.ts");
    expect(files).toContain("src/app/docs/_components/guide-spec.tsx");

    const dropped = files.filter(
      (file) => !filter.shouldInstrument(join(ROOT, file)),
    );
    expect(dropped).toEqual([]);
  });

  it("runs component tests too, not only *.test.ts", () => {
    expect(config.test?.include).toContain("**/*.test.tsx");
  });

  it("runs in the branch CI and publishes the report", () => {
    const ci = read(".github/workflows/ci.yml");

    expect(ci).toMatch(/^\s+run: yarn test:unit --coverage\b/m);
    expect(ci).toMatch(
      /uses: actions\/upload-artifact@[0-9a-f]{40} # v\d+\.\d+\.\d+\r?\n\s+with:\r?\n\s+name: coverage-\$\{\{ github\.sha \}\}\r?\n\s+path: coverage\r?\n/,
    );
    expect(JSON.parse(read("package.json")).scripts["test:unit:coverage"]).toBe(
      "vitest run --dir tests/unitaires --coverage",
    );
  });

  it("keeps the report and the mutation sandbox out of git", () => {
    const lines = read(".gitignore").split(/\r?\n/);

    expect(lines).toContain("/coverage");
    expect(lines).toContain("/.stryker-tmp");
  });
});
