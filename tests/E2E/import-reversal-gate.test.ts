import { test, expect } from "@playwright/test";

import {
  IMPORT_SOURCE_LABEL,
  IMPORT_STATUS_META,
  canReverse,
} from "../../src/features/deliveries/imports/lib/status";

import type { ImportData } from "../../src/actions/import/list-imports";

/**
 * When the screen may offer "Estornar".
 *
 * The rule is small and the cost of getting it wrong is not: offering the undo
 * on a running import lets an operator delete deliveries while the loop is
 * still creating them, and the two race over the same rows. The API refuses it
 * with a 409 — this is the same refusal made before the click, so the operator
 * reads a sentence instead of an error.
 */
function record(overrides: Partial<ImportData> = {}): ImportData {
  return {
    id: "01a00000-0000-7000-8000-000000000001",
    source: "SPREADSHEET",
    status: "COMPLETED",
    filename: "entregas-16-09.xlsx",
    imported: 12,
    duplicated: 0,
    invalid: 0,
    report: {
      imported: 12,
      duplicated: 0,
      invalid: 0,
      unknownHeaders: [],
      rows: [],
      routes: [],
    },
    reversed_at: null,
    businessId: "01a00000-0000-7000-8000-00000000000b",
    performedById: "01a00000-0000-7000-8000-0000000000a1",
    created_at: "2026-09-16T09:00:00.000Z",
    ...overrides,
  };
}

test.describe("offering the undo", () => {
  test("offers it on a finished upload", () => {
    expect(canReverse(record())).toBe(true);
  });

  test("refuses it while the upload is still writing rows", () => {
    // The 409 the API answers, made before the click.
    expect(canReverse(record({ status: "IN_PROGRESS" }))).toBe(false);
  });

  test("refuses it on an upload already undone", () => {
    // "Removed 0" reads like a failure; saying it was already undone is what
    // tells the operator the first click worked.
    expect(
      canReverse(
        record({ status: "REVERSED", reversed_at: "2026-09-16T10:00:00.000Z" }),
      ),
    ).toBe(false);
  });

  test("offers it even when the upload created nothing", () => {
    // A file where every row was a duplicate created no delivery, but it is a
    // finished upload and undoing it is what marks it undone. Refusing here
    // would leave a row nobody can close.
    expect(canReverse(record({ imported: 0, duplicated: 12 }))).toBe(true);
  });
});

test.describe("what the table prints", () => {
  test("names every status a record can hold", () => {
    // The map is exhaustive by type; this catches a label left empty, which
    // the type cannot.
    for (const status of ["IN_PROGRESS", "COMPLETED", "REVERSED"] as const) {
      expect(IMPORT_STATUS_META[status].label.length).toBeGreaterThan(0);
      expect(IMPORT_STATUS_META[status].className).toContain("border-");
    }
  });

  test("does not call a running import concluded", () => {
    // The whole reason IN_PROGRESS exists on this screen.
    expect(IMPORT_STATUS_META.IN_PROGRESS.label).not.toBe(
      IMPORT_STATUS_META.COMPLETED.label,
    );
  });

  test("names both ways a load gets in", () => {
    expect(IMPORT_SOURCE_LABEL.SPREADSHEET).toBe("Planilha");
    expect(IMPORT_SOURCE_LABEL.NFE_XML).toBe("XML da NF-e");
  });
});
