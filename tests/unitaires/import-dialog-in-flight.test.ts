import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The spreadsheet import cannot be closed while its upload is running.
 *
 * The Importar and Cancelar buttons were disabled during the upload, but ESC
 * and the X still closed the dialog. The parent mounts it conditionally, so
 * reopening it built a fresh component with `isImporting` false: the operator
 * could send the same sheet again while the first server action was still
 * running on the API, which is how two uploads of one file raced each other
 * (IDEMP-04). The API now serialises them; this keeps the panel from inviting
 * the race in the first place.
 *
 * Checked against the source, like dialog-dismissal.test.ts: rendering a
 * Radix dialog and pressing ESC needs a DOM harness this runner does not have.
 */
const DIALOG = resolve(
  __dirname,
  "../../src/features/deliveries/deliveries/import-spreadsheet-dialog/index.tsx",
);

/** The root `<Dialog ...>` tag, up to the content it wraps. */
function rootDialogTag(source: string): string {
  const start = source.search(/<Dialog\s/);

  expect(start).toBeGreaterThan(-1);

  const end = source.indexOf("<DialogScrollContent", start);

  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("the spreadsheet import dialog while an upload is in flight", () => {
  it("ignores ESC and the X until the upload answers", () => {
    const source = readFileSync(DIALOG, "utf8").replace(/\r\n/g, "\n");

    const tag = rootDialogTag(source);

    expect(tag).toMatch(/onOpenChange=/);
    expect(tag.slice(tag.indexOf("onOpenChange="))).toMatch(/isImporting/);
  });
});
