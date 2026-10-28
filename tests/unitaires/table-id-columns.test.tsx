import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { CellContext, ColumnDef } from "@tanstack/react-table";

/**
 * The record id in every table (spec §5).
 *
 * The previous round replaced each table's id column with a business field
 * (código, placa, CNPJ, e-mail) and showed the compact id only where none
 * existed — and not even there in Abastecimentos, Checklists, Multas and
 * Importações. Rotas, Empresas and Usuários, which the spec names, showed no
 * id at all, and Ocorrências showed the DELIVERY's id under "Código" while
 * its "Copiar ID" copied the occurrence's. Every record table now starts with
 * the same column (idColumn): the compact id, the full one in the tooltip and
 * for screen readers.
 *
 * Two proofs: a scan that classifies every column file in src (a new table
 * fails here until it is classified), and the builders themselves, called
 * the way the pages call them.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

(globalThis as { React?: typeof React }).React = React;

const ROOT = resolve(__dirname, "../..");
const SOURCE = resolve(ROOT, "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
  });
}

const posix = (path: string) => relative(ROOT, path).split("\\").join("/");

/** Every file of src that lists a table's columns, by path. */
const RECORD_TABLES = new Set([
  "src/app/(protected)/_components/admin/business/table-business-collumns/index.tsx",
  "src/app/(protected)/_components/admin/quote/table-quote-columns/index.tsx",
  "src/features/account-payable/table/columns.tsx",
  "src/features/activity/table/columns.tsx",
  "src/features/branch/table/columns.tsx",
  "src/features/deliveries/deliveries/table-columns.tsx",
  "src/features/deliveries/imports/table-columns.tsx",
  "src/features/deliveries/occurrence-types/table-columns.tsx",
  "src/features/deliveries/occurrences/table-columns.tsx",
  "src/features/deliveries/shippers/table-columns.tsx",
  "src/features/deliveries/status-change-reasons/table-columns.tsx",
  "src/features/driver/table/columns.tsx",
  "src/features/fine/table-columns.tsx",
  "src/features/fuel-type/table/index.tsx",
  "src/features/fuel/table/columns.tsx",
  "src/features/part/table-columns.tsx",
  "src/features/permission/table/columns.tsx",
  "src/features/profile-access/table/columns.tsx",
  "src/features/routes/table-columns.tsx",
  "src/features/service-order/order-parts/table-columns.tsx",
  "src/features/service-order/table-columns.tsx",
  "src/features/supplier/table/columns.tsx",
  "src/features/user/table/columns.tsx",
  "src/features/vehicle-checklist/table-columns.tsx",
  "src/features/vehicle-type/table/index.tsx",
  "src/features/vehicle/table-columns.tsx",
]);

/** Column files that list no record of their own, and why. */
const NOT_RECORD_TABLES = new Map([
  // One row per driver and day, aggregated by the API: its row id is
  // synthetic (`${driverId}:${day}`), there is nothing to quote or copy.
  ["src/features/driver-pauses/table/columns.tsx", "aggregate"],
  // The table itself, its checkbox column and the id column's own module.
  [
    "src/app/(protected)/_components/shared/tanstack-table/data-table/index.tsx",
    "infrastructure",
  ],
  [
    "src/app/(protected)/_components/shared/tanstack-table/select-column/index.tsx",
    "infrastructure",
  ],
  [
    "src/app/(protected)/_components/shared/tanstack-table/id-cell/index.tsx",
    "infrastructure",
  ],
  // Embarcadores, Importações, Tipos de ocorrência and Motivos: the shared
  // table that receives each tab's columns (listed above).
  ["src/features/deliveries/table/section-table.tsx", "infrastructure"],
]);

/** Each builder is imported on first use: its page chunk can take a while. */
const IMPORT_TIMEOUT = 30_000;

const UUID = "019a2f3c-7d8e-7abc-9def-279d9fb8f0bd";
const TAIL = "279d9fb8f0bd";

describe("every column file in src is classified", () => {
  const columnFiles = sourceFiles(SOURCE)
    .filter((path) => readFileSync(path, "utf8").includes("ColumnDef<"))
    .map(posix)
    .sort();

  it("as a record table or as something with no record id", () => {
    const unclassified = columnFiles.filter(
      (path) => !RECORD_TABLES.has(path) && !NOT_RECORD_TABLES.has(path),
    );

    expect(unclassified).toEqual([]);

    // A listed file that no longer exists would let the list rot.
    for (const path of [...RECORD_TABLES, ...NOT_RECORD_TABLES.keys()]) {
      expect(columnFiles, path).toContain(path);
    }
  });

  it.each([...RECORD_TABLES])(
    "%s builds its id column with idColumn",
    (path) => {
      const source = readFileSync(resolve(ROOT, path), "utf8");

      expect(source).toMatch(/\bidColumn\s*(<[^>]*>)?\s*\(/);
      // One shared column, never a hand-written copy of it.
      expect(source).not.toMatch(/<IdCell\s+id=\{row\.original\.id\}/);
    },
  );
});

/** A row every builder can render its id cell from. */
const ROW = { id: UUID } as never;

interface Case {
  name: string;
  columns: () => Promise<ColumnDef<never>[]>;
}

const asColumns = (columns: unknown) => columns as ColumnDef<never>[];

const CASES: Case[] = [
  {
    name: "Empresas",
    columns: async () =>
      asColumns(
        (
          await import("@/app/(protected)/_components/admin/business/table-business-collumns")
        ).tableBusinessCollumns,
      ),
  },
  {
    name: "Orçamentos",
    columns: async () =>
      asColumns(
        (
          await import("@/app/(protected)/_components/admin/quote/table-quote-columns")
        ).tableQuoteColumns,
      ),
  },
  {
    name: "Usuários (/admin)",
    columns: async () =>
      asColumns(
        (await import("@/features/user/table/columns")).buildUserColumns(
          "admin",
        ),
      ),
  },
  {
    name: "Usuários (/dashboard)",
    columns: async () =>
      asColumns(
        (await import("@/features/user/table/columns")).buildUserColumns(
          "dashboard",
        ),
      ),
  },
  {
    name: "Masters",
    columns: async () =>
      asColumns(
        (await import("@/features/user/table/columns")).buildMasterColumns(),
      ),
  },
  {
    name: "Registro de atividades (/admin)",
    columns: async () =>
      asColumns(
        (
          await import("@/features/activity/table/columns")
        ).buildActivityColumns("admin"),
      ),
  },
  {
    name: "Registro de atividades (/dashboard)",
    columns: async () =>
      asColumns(
        (
          await import("@/features/activity/table/columns")
        ).buildActivityColumns("dashboard"),
      ),
  },
  {
    name: "Contas a pagar",
    columns: async () =>
      asColumns(
        (
          await import("@/features/account-payable/table/columns")
        ).buildAccountPayableColumns(),
      ),
  },
  {
    name: "Filiais",
    columns: async () =>
      asColumns(
        (await import("@/features/branch/table/columns")).buildBranchColumns(
          "dashboard",
        ),
      ),
  },
  {
    name: "Entregas",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/deliveries/table-columns")
        ).buildDeliveryColumns(),
      ),
  },
  {
    name: "Importações",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/imports/table-columns")
        ).buildImportColumns(),
      ),
  },
  {
    name: "Tipos de ocorrência",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/occurrence-types/table-columns")
        ).buildOccurrenceTypeColumns(),
      ),
  },
  {
    name: "Ocorrências",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/occurrences/table-columns")
        ).buildOccurrenceColumns(),
      ),
  },
  {
    name: "Embarcadores",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/shippers/table-columns")
        ).buildShipperColumns(),
      ),
  },
  {
    name: "Motivos de status",
    columns: async () =>
      asColumns(
        (
          await import("@/features/deliveries/status-change-reasons/table-columns")
        ).buildStatusChangeReasonColumns(),
      ),
  },
  {
    name: "Motoristas",
    columns: async () =>
      asColumns(
        (await import("@/features/driver/table/columns")).buildDriverColumns(
          "dashboard",
        ),
      ),
  },
  {
    name: "Multas",
    columns: async () =>
      asColumns(
        (await import("@/features/fine/table-columns")).buildFineColumns(),
      ),
  },
  {
    name: "Tipos de combustível",
    columns: async () =>
      asColumns(
        (await import("@/features/fuel-type/table")).buildFuelTypeColumns(),
      ),
  },
  {
    name: "Abastecimentos",
    columns: async () =>
      asColumns(
        (await import("@/features/fuel/table/columns")).buildFuelColumns(),
      ),
  },
  {
    name: "Peças",
    columns: async () =>
      asColumns(
        (await import("@/features/part/table-columns")).buildPartColumns(
          "dashboard",
        ),
      ),
  },
  {
    name: "Permissões",
    columns: async () =>
      asColumns(
        (
          await import("@/features/permission/table/columns")
        ).buildPermissionColumns("dashboard"),
      ),
  },
  {
    name: "Perfis de acesso",
    columns: async () =>
      asColumns(
        (
          await import("@/features/profile-access/table/columns")
        ).buildProfileAccessColumns("dashboard"),
      ),
  },
  {
    name: "Rotas",
    columns: async () =>
      asColumns(
        (await import("@/features/routes/table-columns")).buildRouteColumns(),
      ),
  },
  {
    name: "Peças da OS",
    columns: async () =>
      asColumns(
        (
          await import("@/features/service-order/order-parts/table-columns")
        ).buildOrderPartColumns("dashboard"),
      ),
  },
  {
    name: "Ordens de serviço",
    columns: async () =>
      asColumns(
        (
          await import("@/features/service-order/table-columns")
        ).buildServiceOrderColumns("dashboard"),
      ),
  },
  {
    name: "Fornecedores",
    columns: async () =>
      asColumns(
        (
          await import("@/features/supplier/table/columns")
        ).buildSupplierColumns(),
      ),
  },
  {
    name: "Checklists",
    columns: async () =>
      asColumns(
        (
          await import("@/features/vehicle-checklist/table-columns")
        ).buildVehicleChecklistColumns({ renderRowActions: () => <></> }),
      ),
  },
  {
    name: "Tipos de veículo",
    columns: async () =>
      asColumns(
        (await import("@/features/vehicle-type/table")).buildVehicleTypeColumns(
          "018f0000-0000-7000-8000-00000000000a",
        ),
      ),
  },
  {
    name: "Veículos",
    columns: async () =>
      asColumns(
        (await import("@/features/vehicle/table-columns")).buildVehicleColumns(
          "018f0000-0000-7000-8000-00000000000a",
        ),
      ),
  },
];

/** The id tanstack gives a column: its `id`, else its accessor key. */
function columnIdOf(column: ColumnDef<never>): string {
  return (
    column.id ?? String((column as { accessorKey?: string }).accessorKey ?? "")
  );
}

function renderCell(column: ColumnDef<never>, original: unknown): string {
  if (typeof column.cell !== "function") throw new Error("no cell");

  return renderToStaticMarkup(
    createElement(
      React.Fragment,
      null,
      column.cell({ row: { original } } as CellContext<never, unknown>),
    ),
  );
}

describe("every record table starts with the record id", () => {
  it.each(CASES)(
    "$name",
    async ({ columns: build }) => {
      const columns = await build();
      const ids = columns.map(columnIdOf);

      expect(ids[0]).toBe("id");
      expect(ids.filter((id) => id === "id")).toHaveLength(1);

      const [first] = columns;

      expect(first.enableHiding).toBe(false);
      expect((first.meta as { title?: string }).title).toBe("ID");

      const html = renderCell(first, ROW);

      // The compact tail shown, the full id in the tooltip and for readers.
      expect(html).toContain(`<span aria-hidden="true">${TAIL}</span>`);
      expect(html).toContain(`title="${UUID}"`);
      expect(html).toContain(
        `<span class="sr-only select-none">${UUID}</span>`,
      );
    },
    IMPORT_TIMEOUT,
  );
});

describe("Ocorrências names its own id, and the delivery's apart", () => {
  const DELIVERY = "019a2f3c-0000-7000-8000-00000000de11";

  const occurrence = {
    id: UUID,
    delivery: { id: DELIVERY, code: null },
  };

  it("shows the occurrence's id first and the delivery's under its own title", async () => {
    // Red before: the first column, titled "Código", showed the delivery's
    // compact id while "Copiar ID" copied the occurrence's.
    const { buildOccurrenceColumns } =
      await import("@/features/deliveries/occurrences/table-columns");
    const columns = asColumns(buildOccurrenceColumns());

    expect(renderCell(columns[0], occurrence)).toContain(TAIL);
    expect(renderCell(columns[0], occurrence)).not.toContain("de11");

    const delivery = columns.find(
      (column) => columnIdOf(column) === "deliveryCode",
    )!;

    expect((delivery.meta as { title?: string }).title).toBe(
      "Código da entrega",
    );
    expect(renderCell(delivery, occurrence)).toContain(`title="${DELIVERY}"`);
    expect(
      renderCell(delivery, {
        ...occurrence,
        delivery: { id: DELIVERY, code: "PED-1" },
      }),
    ).toContain("PED-1");
  });
});

describe("no id shows twice in a row", () => {
  it("Entregas and Contas a pagar no longer fall back to the id in their code column", async () => {
    const { buildDeliveryColumns } =
      await import("@/features/deliveries/deliveries/table-columns");
    const code = asColumns(buildDeliveryColumns()).find(
      (column) => columnIdOf(column) === "code",
    )!;

    expect(
      renderCell(code, { id: UUID, code: null, invoice_number: null }),
    ).not.toContain(TAIL);

    const { buildAccountPayableColumns } =
      await import("@/features/account-payable/table/columns");
    const document = asColumns(buildAccountPayableColumns()).find(
      (column) => columnIdOf(column) === "document_number",
    )!;

    expect(
      renderCell(document, { id: UUID, document_number: null }),
    ).not.toContain(TAIL);
  });

  it("Contas a pagar's service order reads OS # with the full id for the tooltip and readers", async () => {
    const { buildAccountPayableColumns } =
      await import("@/features/account-payable/table/columns");
    const order = asColumns(buildAccountPayableColumns()).find(
      (column) => columnIdOf(column) === "serviceOrder",
    )!;
    const html = renderCell(order, { id: "x", serviceOrderId: UUID });

    expect(html).toContain(`OS #${TAIL}`);
    expect(html).toContain(`title="OS #${UUID}"`);
    expect(html).toContain(
      `<span class="sr-only select-none">OS #${UUID}</span>`,
    );
  });
});
