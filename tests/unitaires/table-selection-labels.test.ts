import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The selection checkboxes of every table speak Portuguese.
 *
 * Entregas, Embarcadores and Tipos de ocorrência named their checkboxes
 * "Select all" and "Select row": the only thing a screen reader says about
 * the control, in English, in a Portuguese product. The scan first covered
 * only the operation features, and the same English survived in Checklists
 * and in the /admin Empresas and Orçamentos tables; it now reads all of src.
 *
 * The tables no longer write their own checkbox column: the DataTable draws
 * the shared one (tanstack-table/select-column) when a list has bulk
 * actions, so a column written by hand again is a regression too.
 */
const ROOT = resolve(__dirname, "../..");

const SOURCE = resolve(ROOT, "src");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return tsxFiles(path);

    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("the selection checkboxes of the tables", () => {
  const files = tsxFiles(SOURCE);

  it("are found (the scan reads the features)", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(
      files
        .filter((file) =>
          readFileSync(file, "utf8").includes('aria-label="Selecionar linha"'),
        )
        .map((file) => relative(ROOT, file).replace(/\\/g, "/")),
    ).toEqual([
      "src/app/(protected)/_components/shared/tanstack-table/select-column/index.tsx",
    ]);
  });

  it("are drawn by the DataTable, never by a table's own column list", () => {
    const handWritten = files
      .filter((file) => !file.includes("tanstack-table"))
      .filter((file) => /id:\s*"select"/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

    expect(handWritten).toEqual([]);
  });

  it("are named in Portuguese", () => {
    const english = files
      .filter((file) =>
        /aria-label="Select (all|row)"/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(ROOT, file).replace(/\\/g, "/"));

    expect(english).toEqual([]);
  });
});
