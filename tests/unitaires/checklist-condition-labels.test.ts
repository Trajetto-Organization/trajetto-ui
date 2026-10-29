import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CHECKLIST_CONDITION_LABELS } from "@/features/vehicle-checklist/server-table";
import { OVERALL_CONDITION_OPTIONS } from "@/features/vehicle-checklist/lib/condition-options";
import { overallConditionConfig } from "@/app/(protected)/_components/shared/checklist-details-dialog/data";

/**
 * "Condição geral" of a vehicle checklist says the same thing everywhere.
 *
 * The create form offered "Reprovado" and "Aprovado com restrições"; the edit
 * form "Rejeitado" and "Aprovado com Restrições"; the details dialog
 * "Rejeitado" and "Aprovado c/ Restrições"; the table and its filter
 * "Reprovado". Seen while driving the checklist form in
 * tests/ui/journey-fleet.spec.ts. One set of labels now, the table's.
 */
const FORMS = [
  "../../src/features/vehicle-checklist/create-form/submit.tsx",
  "../../src/features/vehicle-checklist/update-form/submit.tsx",
];

describe("the checklist's overall condition", () => {
  it("the forms offer exactly the table's labels", () => {
    expect(OVERALL_CONDITION_OPTIONS).toEqual([
      { value: "approved", label: "Aprovado" },
      { value: "approved_with_restrictions", label: "Aprovado com restrições" },
      { value: "rejected", label: "Reprovado" },
    ]);

    for (const form of FORMS) {
      const source = readFileSync(resolve(__dirname, form), "utf8");

      expect(source, `${form} voltou a ter a própria lista`).not.toMatch(
        /const OVERALL_CONDITION_OPTIONS\s*=/,
      );
      expect(source).toContain('from "../lib/condition-options"');
    }
  });

  it("the details dialog says the same", () => {
    for (const [value, label] of Object.entries(CHECKLIST_CONDITION_LABELS)) {
      expect(overallConditionConfig[value]?.label).toBe(label);
    }
  });
});
