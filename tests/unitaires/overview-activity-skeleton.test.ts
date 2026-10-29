import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

/**
 * The /admin overview's "Atividades recentes" skeletons have the table's
 * columns (spec §5 added ID first).
 *
 * The MASTER's table reads ID, Tipo, Descrição, Nome, E-mail, Empresa, Data
 * and Status: eight columns. Both skeletons that stand in for it (the
 * route's loading.tsx and the Suspense fallback of admin/page.tsx) still drew
 * seven, so the columns shifted when the table arrived.
 */
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

(globalThis as { React?: typeof React }).React = React;

const ROOT = resolve(__dirname, "../..");

/** The header cells of the overview's activity table for a MASTER. */
function masterHeaderCount(): number {
  const source = readFileSync(
    resolve(
      ROOT,
      "src/app/(protected)/_components/overview-dashboard/index.tsx",
    ),
    "utf8",
  );
  const header = /<TableHeader>([\s\S]*?)<\/TableHeader>/.exec(source)?.[1];

  return (header?.match(/<TableHead>/g) ?? []).length;
}

function lastTable(markup: string): { heads: number; firstRow: string[] } {
  const table = markup.slice(markup.lastIndexOf("<table"));
  const head = /<thead[\s\S]*?<\/thead>/.exec(table)?.[0] ?? "";
  const row = /<tbody[^>]*><tr[^>]*>([\s\S]*?)<\/tr>/.exec(table)?.[1] ?? "";

  return {
    heads: (head.match(/<th[\s>]/g) ?? []).length,
    firstRow: row.match(/<td[\s\S]*?<\/td>/g) ?? [],
  };
}

describe("the /admin overview's activity skeletons", () => {
  it("count the MASTER's eight columns, ID first", async () => {
    expect(masterHeaderCount()).toBe(8);

    const { default: AdminLoading } =
      await import("@/app/(protected)/admin/loading");
    const { ProtectedDashboardContentLoading } =
      await import("@/app/(protected)/_components/loading-page/protected-dashboard-content-loading");

    for (const component of [AdminLoading, ProtectedDashboardContentLoading]) {
      const { heads, firstRow } = lastTable(
        renderToStaticMarkup(createElement(component)),
      );

      expect(heads).toBe(8);
      expect(firstRow).toHaveLength(8);
      // The id cell is IdCell's 112px.
      expect(firstRow[0]).toContain("w-28");
    }
  });
});
