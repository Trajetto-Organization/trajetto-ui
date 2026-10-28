import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  CellContext,
  ColumnDef,
  HeaderContext,
} from "@tanstack/react-table";

import {
  ID_COLUMN_ID,
  IdCell,
  SHORT_ID_LENGTH,
  idColumn,
  shortId,
} from "@/app/(protected)/_components/shared/tanstack-table/id-cell";
import {
  formatServiceOrderDisplay,
  serviceOrderLabel,
} from "@/lib/format-values";

(globalThis as { React?: typeof React }).React = React;

/**
 * The record id as every table shows it (spec §5): the example the spec
 * quotes from Registro de Atividades, `279d9fb8f0bd`, is the last twelve
 * characters of a UUIDv7 — its random part; the head is the creation time and
 * repeats for every record of the same minute. The abbreviation is
 * presentation only: the full id stays in the tooltip, for screen readers and
 * in "Copiar ID".
 */
const UUID = "019a2f3c-7d8e-7abc-9def-279d9fb8f0bd";
const TAIL = "279d9fb8f0bd";

const html = (element: React.ReactElement) => renderToStaticMarkup(element);

describe("shortId", () => {
  it("keeps the random tail of a UUID, in any case", () => {
    expect(SHORT_ID_LENGTH).toBe(12);
    expect(shortId(UUID)).toBe(TAIL);
    expect(shortId(UUID.toUpperCase())).toBe(TAIL.toUpperCase());
  });

  it("shows any other id whole: cutting it would show another value", () => {
    // A number cut to its tail reads as a different number; a composite key's
    // tail is not unique. Neither is a UUID, so neither is abbreviated.
    expect(shortId("12345")).toBe("12345");
    expect(shortId("1234567890123456")).toBe("1234567890123456");
    expect(shortId("drv-1:2026-10-28")).toBe("drv-1:2026-10-28");
  });
});

describe("serviceOrderLabel", () => {
  it("names a service order the way its table cell does", () => {
    expect(serviceOrderLabel(UUID)).toBe(`OS #${TAIL}`);
    expect(
      formatServiceOrderDisplay({ id: UUID, date: null, vehicle: null }),
    ).toMatch(new RegExp(`^OS #${TAIL} - `));
  });

  it("is the only place outside IdCell that cuts an id (spec §5.5)", () => {
    // The pickers and labels used to cut "OS#" + the last twelve by hand, with
    // two spellings and no UUID check; a new hand-cut label fails here.
    const root = resolve(__dirname, "../..");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path);
        return /.(tsx|ts)$/.test(entry.name) ? [path] : [];
      });
    const offenders = walk(resolve(root, "src"))
      .filter((path) => /slice(-12)|OS#${/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path).split("\\").join("/"));

    expect(offenders).toEqual([]);
  });
});

describe("IdCell", () => {
  it("shows the tail in monospace, the full id in the tooltip and for readers", () => {
    const markup = html(createElement(IdCell, { id: UUID }));

    expect(markup).toContain(`<span aria-hidden="true">${TAIL}</span>`);
    expect(markup).toContain(`title="${UUID}"`);
    expect(markup).toContain(
      `<span class="sr-only select-none">${UUID}</span>`,
    );
    expect(markup).toContain("font-mono");
    // 112px: twelve monospace characters, no more.
    expect(markup).toContain("w-28");
  });

  it("lets a double click copy the tail alone, never glued to the full id", () => {
    const markup = html(createElement(IdCell, { id: UUID }));

    // After the tail, the reader's copy made one word with it: a double click
    // selected "279d9fb8f0bd019a2f3c" (measured in Chromium). First and out
    // of mouse selections, it is skipped and the word ends with the tail.
    expect(markup).toMatch(
      new RegExp(
        `^<p[^>]*><span class="sr-only select-none">${UUID}</span><span aria-hidden="true">${TAIL}</span></p>$`,
      ),
    );
  });

  it("reads N/A without an id", () => {
    expect(html(createElement(IdCell, { id: null }))).toContain("N/A");
    expect(html(createElement(IdCell, { id: undefined }))).not.toContain(
      "title=",
    );
  });

  it("puts a label before the id, kept in the tooltip and for readers", () => {
    const markup = html(
      createElement(IdCell, { id: UUID, prefix: "OS #", className: "w-40" }),
    );

    expect(markup).toContain(`<span aria-hidden="true">OS #${TAIL}</span>`);
    expect(markup).toContain(`title="OS #${UUID}"`);
    expect(markup).toContain(
      `<span class="sr-only select-none">OS #${UUID}</span>`,
    );
    // The width given replaces the default one instead of fighting it.
    expect(markup).toContain("w-40");
    expect(markup).not.toContain("w-28");
  });
});

describe("idColumn", () => {
  function cellOf<T>(column: ColumnDef<T>, original: T): string {
    if (typeof column.cell !== "function") throw new Error("no cell");

    return html(
      createElement(
        React.Fragment,
        null,
        column.cell({ row: { original } } as CellContext<T, unknown>),
      ),
    );
  }

  it("is the same first column everywhere: id, titled ID, never hidden, not sorted", () => {
    const column = idColumn<{ id: string }>();

    expect(column.id).toBe(ID_COLUMN_ID);
    expect(ID_COLUMN_ID).toBe("id");
    expect((column.meta as { title?: string }).title).toBe("ID");
    expect(column.enableHiding).toBe(false);
    expect(column.enableSorting).toBe(false);
    expect(cellOf(column, { id: UUID })).toContain(TAIL);

    // The header is the shared one: a column that cannot sort shows its
    // title as plain text, no menu.
    const header = column.header as (
      context: HeaderContext<{ id: string }, unknown>,
    ) => React.ReactElement;
    const headerHtml = html(
      header({
        column: { getCanSort: () => false },
      } as unknown as HeaderContext<{ id: string }, unknown>),
    );

    expect(headerHtml).toMatch(/^<div[^>]*>ID<\/div>$/);
  });

  it("reads the id the table names when the row's own is not the record's", () => {
    const column = idColumn<{ record: { id: string } }>((row) => row.record.id);

    expect(cellOf(column, { record: { id: UUID } })).toContain(
      `title="${UUID}"`,
    );

    const accessor = (
      column as unknown as { accessorFn: (row: unknown) => unknown }
    ).accessorFn;

    expect(accessor({ record: { id: UUID } })).toBe(UUID);
  });
});
