import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  normalizeFormFields,
  occurrenceFormFieldsSchema,
  validateOccurrenceAnswers,
} from "@/features/deliveries/occurrence-types/form-builder/rules";

/**
 * The web's copy of the occurrence form rules (decision 6.2) against the
 * API's: the same shared cases, and the same code below the header comment.
 * A builder that accepted what the API refuses would lose a company's form
 * at "Salvar"; a panel report checked more loosely would be refused after the
 * round trip.
 */
const API = resolve(__dirname, "../../../trajetto-api");
const HAS_API = existsSync(
  join(API, "src/modules/occurrence-type/form/occurrence-form-rules.ts"),
);

const WEB_RULES = resolve(
  __dirname,
  "../../src/features/deliveries/occurrence-types/form-builder/rules.ts",
);

/** The file without its leading doc comment (each copy says where it lives). */
function body(path: string): string {
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");

  return source.replace(
    /^import \{ z \} from "zod";\n\n\/\*\*[\s\S]*?\*\/\n/,
    "",
  );
}

describe.skipIf(!HAS_API)("parity with trajetto-api", () => {
  it("is the API's code, line for line, below the header", () => {
    expect(body(WEB_RULES)).toBe(
      body(
        join(API, "src/modules/occurrence-type/form/occurrence-form-rules.ts"),
      ),
    );
  });

  const cases = HAS_API
    ? (JSON.parse(
        readFileSync(
          join(
            API,
            "tests/unitaires/occurrence-type/fixtures/occurrence-form-cases.json",
          ),
          "utf8",
        ),
      ) as {
        form: unknown[];
        answers: Array<{
          name: string;
          given: Record<string, unknown>;
          kept: Record<string, unknown> | null;
          errors: string[];
        }>;
        definitions: Array<{ name: string; fields: unknown[]; valid: boolean }>;
      })
    : { form: [], answers: [], definitions: [] };

  const form = HAS_API
    ? normalizeFormFields(occurrenceFormFieldsSchema.parse(cases.form))
    : null;

  it.each(cases.answers.map((entry) => [entry.name, entry] as const))(
    "answers: %s",
    (_name, entry) => {
      const verdict = validateOccurrenceAnswers(form, entry.given);

      expect(Object.keys(verdict.errors).sort()).toEqual(
        [...entry.errors].sort(),
      );

      if (entry.errors.length === 0)
        expect(verdict.answers).toEqual(entry.kept);
    },
  );

  it.each(cases.definitions.map((entry) => [entry.name, entry] as const))(
    "definition: %s",
    (_name, entry) => {
      expect(occurrenceFormFieldsSchema.safeParse(entry.fields).success).toBe(
        entry.valid,
      );
    },
  );
});
