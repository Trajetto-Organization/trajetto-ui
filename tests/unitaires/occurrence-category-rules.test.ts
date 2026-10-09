import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  categoryIssues,
  missingRequirements,
  type CategoryShape,
  type ReportAttachments,
  type ReportRequirements,
} from "@/features/deliveries/occurrence-types/category-rules";

/**
 * The web's copy of the API's occurrence category rules (decisions 14.3 and
 * 14.4) against the API's: the same code below the header comment, and the
 * same shared cases. A dialog that let through what the API refuses would
 * lose the operator's edit at "Salvar".
 */
const API = resolve(__dirname, "../../../trajetto-api");
const API_RULES = join(
  API,
  "src/modules/occurrence-type/rules/occurrence-category-rules.ts",
);
const API_CASES = join(
  API,
  "tests/unitaires/occurrence-type/fixtures/occurrence-requirements-cases.json",
);
const HAS_API = existsSync(API_RULES);

const WEB_RULES = resolve(
  __dirname,
  "../../src/features/deliveries/occurrence-types/category-rules.ts",
);

/** The file without its leading doc comment (each copy says where it lives). */
function body(path: string): string {
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");

  return source.replace(/^\/\*\*[\s\S]*?\*\/\n/, "");
}

interface SharedCases {
  matrix: Array<{ name: string; shape: CategoryShape; issues: unknown[] }>;
  missing: Array<{
    name: string;
    type: ReportRequirements;
    sent: ReportAttachments;
    missing: unknown[];
  }>;
}

describe.skipIf(!HAS_API)("parity with trajetto-api", () => {
  it("is the API's code, line for line, below the header", () => {
    expect(body(WEB_RULES)).toBe(body(API_RULES));
  });

  const cases = HAS_API
    ? (JSON.parse(readFileSync(API_CASES, "utf8")) as SharedCases)
    : { matrix: [], missing: [] };

  it.each(cases.matrix.map((entry) => [entry.name, entry] as const))(
    "matrix: %s",
    (_name, entry) => {
      expect(categoryIssues(entry.shape)).toEqual(entry.issues);
    },
  );

  it.each(cases.missing.map((entry) => [entry.name, entry] as const))(
    "missing: %s",
    (_name, entry) => {
      expect(missingRequirements(entry.type, entry.sent)).toEqual(
        entry.missing,
      );
    },
  );
});
