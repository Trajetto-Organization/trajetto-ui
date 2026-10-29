import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

import {
  applyLocalFacets,
  localSelectionOf,
  sortLocally,
} from "@/app/(protected)/_components/shared/tanstack-table/data-table/local-table";
import type { ServerTableSpec } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";
import { CATALOG_TABLES } from "@/features/deliveries/lib/catalog-tables";
import {
  CATALOG_LOCAL,
  CATALOG_SUMMARIES,
} from "@/features/deliveries/lib/catalog-local";
import {
  BRANCH_TABLE,
  type BranchRow,
} from "@/features/branch/lib/server-table";
import {
  BRANCH_LOCAL,
  summarizeBranches,
} from "@/features/branch/lib/local-table";

/**
 * The browser's answer for a complete catalog (spec §13) against the API's
 * OWN code, imported from the sibling repository: its summarizers (cards,
 * pager total, disjunctive facet counts) fed the GROUP BY a database would
 * return for the same rows, and its order resolution (resolveOrderBy with
 * each list's SortSpec) applied to the same rows.
 *
 * Random catalogs and selections from a fixed seed, so a drift in either
 * repository fails here. Skipped when trajetto-api is not beside this
 * repository. The live check against a running API (672 URL combinations)
 * is in the §13 measurement notes.
 */
const API = resolve(process.cwd(), "..", "trajetto-api/src");
const hasApi = existsSync(`${API}/shared/delivery/catalog-list.ts`);

/**
 * Loads an API module as the API runs it: TypeScript transpiled, its `@/`
 * alias pointed at ITS src, packages from its node_modules. (Vite refuses
 * files outside this repository, hence the small loader.) The search
 * builder is stubbed: the summarizers and sort specs never call it.
 */
const loaded = new Map<string, Record<string, any>>();
const apiRequire = createRequire(resolve(API, "..", "package.json"));

function loadApi(file: string): Record<string, any> {
  const path = file.endsWith(".ts") ? file : `${file}.ts`;
  const cached = loaded.get(path);

  if (cached) return cached;

  const module = { exports: {} as Record<string, any> };

  loaded.set(path, module.exports);

  const { code } = transformSync(readFileSync(path, "utf8"), {
    loader: "ts",
    format: "cjs",
    target: "es2022",
  });

  const localRequire = (specifier: string) => {
    if (specifier === "@/shared/pagination/search-or") {
      return { buildSearchOr: () => ({}) };
    }
    if (specifier.startsWith("@/")) {
      return loadApi(resolve(API, specifier.slice(2)));
    }
    if (specifier.startsWith(".")) {
      return loadApi(resolve(dirname(path), specifier));
    }

    return apiRequire(specifier);
  };

  new Function("require", "module", "exports", code)(
    localRequire,
    module,
    module.exports,
  );

  loaded.set(path, module.exports);

  return module.exports;
}

const api = async () => ({
  occurrence: loadApi(
    `${API}/modules/occurrence-type/usecases/list-occurrence-type/occurrence-type-list.ts`,
  ),
  shipper: loadApi(
    `${API}/modules/shipper/usecases/list-shipper/shipper-list.ts`,
  ),
  reason: loadApi(
    `${API}/modules/status-change-reason/usecases/list-status-change-reason/status-change-reason-list.ts`,
  ),
  branch: loadApi(`${API}/modules/branch/usecases/list-branch/branch-list.ts`),
  query: loadApi(`${API}/shared/pagination/list-query.ts`),
});

/** A small deterministic PRNG (mulberry32). */
function random(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(next: () => number, list: readonly T[]): T =>
  list[Math.floor(next() * list.length)];

function uuid(next: () => number): string {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(next() * 16).toString(16),
  ).join("");

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Timestamps of millisecond precision, with ties on purpose. */
function instant(next: () => number): string {
  const base = Date.UTC(2026, 9, 1);

  return new Date(base + Math.floor(next() * 6) * 3_600_000).toISOString();
}

/** A selection of a facet's values: none, one, several or all. */
function subset(next: () => number, values: readonly string[]): string[] {
  return values.filter(() => next() < 0.4);
}

function groupBy<T>(rows: T[], keyOf: (row: T) => string) {
  const groups = new Map<string, { row: T; count: number }>();

  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);

    if (group) group.count += 1;
    else groups.set(key, { row, count: 1 });
  }

  return Array.from(groups.values());
}

/** Prisma's orderBy entries applied in memory, as Postgres orders them. */
function orderByApi<T extends Record<string, unknown>>(
  rows: T[],
  orderBy: Record<string, unknown>[],
): T[] {
  const value = (row: T, field: string) => {
    const raw = row[field];

    if (typeof raw === "boolean") return Number(raw);
    if (field.endsWith("_at")) return Date.parse(String(raw));

    return String(raw);
  };

  return rows.slice().sort((a, b) => {
    for (const entry of orderBy) {
      const [field, direction] = Object.entries(entry)[0];
      const order =
        typeof direction === "string"
          ? direction
          : (direction as { sort: string }).sort;
      const left = value(a, field);
      const right = value(b, field);

      if (left !== right) {
        const result = left < right ? -1 : 1;

        return order === "desc" ? -result : result;
      }
    }

    return 0;
  });
}

function params(entries: Record<string, string[]>, extra = {}) {
  const search = new URLSearchParams(extra);

  for (const [key, values] of Object.entries(entries)) {
    if (values.length > 0) search.set(key, values.join(","));
  }

  return search;
}

const ROUNDS = 150;

describe.skipIf(!hasApi)(
  "the browser answers a catalog as the API does",
  () => {
    it("Tipos de ocorrência: rows, pager total, cards and every facet count", async () => {
      const { occurrence } = await api();
      const next = random(14);

      for (let round = 0; round < ROUNDS; round += 1) {
        const rows = Array.from(
          { length: 1 + Math.floor(next() * 40) },
          () => ({
            id: uuid(next),
            is_active: next() < 0.7,
            blocks_delivery: next() < 0.4,
            requires_photo: next() < 0.5,
            category: pick(next, ["DELIVERED", "NOT_DELIVERED", "PAUSE"]),
            created_at: instant(next),
            updated_at: instant(next),
          }),
        );

        const chosen = {
          status: subset(next, ["active", "inactive"]),
          blocking: subset(next, ["yes", "no"]),
          photo: subset(next, ["yes", "no"]),
          category: subset(next, ["DELIVERED", "NOT_DELIVERED", "PAUSE"]),
        };

        const groups = groupBy(
          rows,
          (row) =>
            `${row.is_active}|${row.blocks_delivery}|${row.requires_photo}|${row.category}`,
        ).map(({ row, count }) => ({
          is_active: row.is_active,
          blocks_delivery: row.blocks_delivery,
          requires_photo: row.requires_photo,
          category: row.category,
          count,
        }));

        const expected = occurrence.summarizeOccurrenceTypeList(groups, {
          statuses: chosen.status.length ? chosen.status : undefined,
          blocking: chosen.blocking.length ? chosen.blocking : undefined,
          photo: chosen.photo.length ? chosen.photo : undefined,
          categories: chosen.category.length ? chosen.category : undefined,
        });

        const spec = CATALOG_TABLES["occurrence-types"];
        const local = CATALOG_LOCAL["occurrence-types"];
        const selection = localSelectionOf(params(chosen), spec);

        expect(applyLocalFacets(rows, spec, local, selection)).toHaveLength(
          expected.total,
        );
        expect(
          CATALOG_SUMMARIES["occurrence-types"](rows, selection, {}),
        ).toEqual(expected.searchMeta);
      }
    });

    it("Embarcadores and Motivos: the cards do not move with Status, the pager does", async () => {
      const { shipper, reason } = await api();
      const next = random(7);

      for (let round = 0; round < ROUNDS; round += 1) {
        const rows = Array.from({ length: Math.floor(next() * 30) }, () => ({
          id: uuid(next),
          is_active: next() < 0.6,
          cnpj: next() < 0.5 ? "11222333000181" : null,
        }));
        const statuses = subset(next, ["active", "inactive"]);

        const shipperGroups = groupBy(rows, (row) => String(row.is_active)).map(
          ({ row }) => ({
            is_active: row.is_active,
            count: rows.filter((other) => other.is_active === row.is_active)
              .length,
            withCnpj: rows.filter(
              (other) =>
                other.is_active === row.is_active && other.cnpj !== null,
            ).length,
          }),
        );

        const filters = { statuses: statuses.length ? statuses : undefined };
        // The base: what the complete read (no facet) brought.
        const base = shipper.summarizeShipperList(shipperGroups, {});
        const expected = shipper.summarizeShipperList(shipperGroups, filters);

        const spec = CATALOG_TABLES.shippers;
        const selection = localSelectionOf(params({ status: statuses }), spec);

        expect(
          applyLocalFacets(rows, spec, CATALOG_LOCAL.shippers, selection),
        ).toHaveLength(expected.total);
        expect(
          CATALOG_SUMMARIES.shippers(rows, selection, base.searchMeta),
        ).toEqual(expected.searchMeta);

        const reasonGroups = shipperGroups.map(({ is_active, count }) => ({
          is_active,
          count,
        }));
        const used = Math.floor(next() * 5);
        const reasonBase = reason.summarizeStatusReasonList(
          reasonGroups,
          used,
          {},
        );
        const reasonExpected = reason.summarizeStatusReasonList(
          reasonGroups,
          used,
          filters,
        );

        expect(
          applyLocalFacets(
            rows,
            CATALOG_TABLES["status-change-reasons"],
            CATALOG_LOCAL["status-change-reasons"],
            selection,
          ),
        ).toHaveLength(reasonExpected.total);
        expect(
          CATALOG_SUMMARIES["status-change-reasons"](
            rows,
            selection,
            reasonBase.searchMeta,
          ),
        ).toEqual(reasonExpected.searchMeta);
      }
    });

    it("Filiais: rows, cards, Status and UF options (present UFs plus a chosen empty one)", async () => {
      const { branch } = await api();
      const next = random(27);
      const ufs = ["SP", "RJ", "MG", "PR", "AC", "BA"];

      for (let round = 0; round < ROUNDS; round += 1) {
        const rows = Array.from(
          { length: Math.floor(next() * 35) },
          () =>
            ({
              id: uuid(next),
              is_active: next() < 0.7,
              uf: pick(next, ufs),
              erp_code: next() < 0.5 ? "ERP-1" : null,
              fantasy_name: pick(next, [null, "", "Loja", " "]),
              created_at: instant(next),
              updated_at: instant(next),
            }) as unknown as BranchRow,
        );

        const chosen = {
          status: subset(next, ["active", "inactive"]),
          uf: subset(next, ufs),
        };

        const groups = groupBy(rows, (row) => `${row.is_active}|${row.uf}`).map(
          ({ row }) => {
            const members = rows.filter(
              (other) =>
                other.is_active === row.is_active && other.uf === row.uf,
            );

            return {
              is_active: row.is_active,
              uf: row.uf,
              count: members.length,
              withErpCode: members.filter((member) => member.erp_code !== null)
                .length,
            };
          },
        );

        const selection = localSelectionOf(params(chosen), BRANCH_TABLE);
        const kept = applyLocalFacets(
          rows,
          BRANCH_TABLE,
          BRANCH_LOCAL,
          selection,
        );

        // The repository's own count: not NULL and not "" over the filtered set.
        const withFantasyName = kept.filter(
          (row) => row.fantasy_name !== null && row.fantasy_name !== "",
        ).length;

        const expected = branch.summarizeBranchList(groups, withFantasyName, {
          statuses: chosen.status.length ? chosen.status : undefined,
          ufs: chosen.uf.length ? chosen.uf : undefined,
        });

        expect(kept).toHaveLength(expected.total);
        expect(summarizeBranches(rows, selection, {})).toEqual(
          expected.searchMeta,
        );
      }
    });

    it("orders by every local sort exactly as resolveOrderBy, ties included", async () => {
      const { occurrence, shipper, reason, branch, query } = await api();
      const next = random(99);

      const cases: [string, ServerTableSpec, typeof BRANCH_LOCAL, unknown][] = [
        [
          "occurrence-types",
          CATALOG_TABLES["occurrence-types"],
          CATALOG_LOCAL["occurrence-types"],
          occurrence.OCCURRENCE_TYPE_SORT,
        ],
        [
          "shippers",
          CATALOG_TABLES.shippers,
          CATALOG_LOCAL.shippers,
          shipper.SHIPPER_SORT,
        ],
        [
          "status-change-reasons",
          CATALOG_TABLES["status-change-reasons"],
          CATALOG_LOCAL["status-change-reasons"],
          reason.STATUS_REASON_SORT,
        ],
        ["branches", BRANCH_TABLE, BRANCH_LOCAL, branch.BRANCH_SORT],
      ];

      for (const [, spec, local, sortSpec] of cases) {
        for (let round = 0; round < 40; round += 1) {
          const rows = Array.from(
            { length: 2 + Math.floor(next() * 25) },
            () => ({
              id: uuid(next),
              is_active: next() < 0.5,
              created_at: instant(next),
              updated_at: instant(next),
            }),
          );

          for (const id of [undefined, ...Object.keys(local.sorts)]) {
            for (const desc of [false, true]) {
              const sorting = id
                ? [{ id, desc }]
                : spec.defaultSort
                  ? [spec.defaultSort]
                  : [];
              const orderBy = query.resolveOrderBy(
                sortSpec,
                id ? { sort: id, order: desc ? "desc" : "asc" } : {},
              );

              expect(
                sortLocally(rows, sorting, local)?.map((row) => row.id),
              ).toEqual(orderByApi(rows, orderBy).map((row) => row.id));
            }
          }
        }
      }
    });
  },
);
