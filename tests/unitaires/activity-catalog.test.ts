import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACTIVITY_ROLE_LABELS,
  ACTIVITY_STATUS_CATALOG,
  ACTIVITY_TYPE_CATALOG,
  activityRoleClass,
  activityRoleOptions,
  activityStatusClass,
  activityStatusLabel,
  activityStatusOptions,
  activityTypeOptions,
  isModuleOffered,
} from "@/features/activity/lib/activity-catalog";
import {
  ACTIVITY_TABLE,
  activityListQuery,
} from "@/features/activity/lib/server-table";

/**
 * The activity trail's one catalog on the web (FLEET-ACT-2/4/5/7, ACT-MOD-1).
 *
 * The status → badge map was copied four times, knew nine of some thirty
 * statuses and painted "Entregue" or "Planejada" in the grey of the unknown;
 * the filter offered a fixed list with no Entregas status and no module rule,
 * and the app's driver read as "Colaborador".
 */

const API_CATALOG = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "activity",
  "activity-catalog.ts",
);

const hasApi = existsSync(API_CATALOG);

interface ParsedEntry {
  value: string;
  module: string;
  aliases: string[];
}

/** The entries of one `const NAME = [ … ] as const` block of the API file. */
function apiEntries(constant: string): ParsedEntry[] {
  const source = readFileSync(API_CATALOG, "utf8");
  const block = new RegExp(
    `const ${constant} = \\[([\\s\\S]*?)\\] as const`,
  ).exec(source);

  if (!block) throw new Error(`${constant} not found in the API catalog`);

  return [...block[1].matchAll(/\{([^{}]*)\}/g)].map(([, body]) => ({
    value: /value:\s*"([^"]+)"/.exec(body)?.[1] ?? "",
    module: /module:\s*"([^"]+)"/.exec(body)?.[1] ?? "",
    aliases: [
      ...(/aliases:\s*\[([^\]]*)\]/.exec(body)?.[1] ?? "").matchAll(
        /"([^"]+)"/g,
      ),
    ].map((match) => match[1]),
  }));
}

describe.skipIf(!hasApi)(
  `the web catalog mirrors the API's${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("the same statuses, modules and legacy spellings, in the same order", () => {
      const web = ACTIVITY_STATUS_CATALOG.map((entry) => ({
        value: entry.value,
        module: entry.module,
        aliases: [...(entry.aliases ?? [])],
      }));

      expect(web).toEqual(apiEntries("ACTIVITY_STATUS_CATALOG"));
    });

    it("the same types and modules", () => {
      const web = ACTIVITY_TYPE_CATALOG.map((entry) => ({
        value: entry.value,
        module: entry.module,
        aliases: [],
      }));

      expect(web).toEqual(apiEntries("ACTIVITY_TYPE_CATALOG"));
    });
  },
);

describe("the badges", () => {
  it("paint every catalog status, not the grey of the unknown", () => {
    const unknown = activityStatusClass("Voando");

    for (const entry of ACTIVITY_STATUS_CATALOG) {
      expect(activityStatusClass(entry.value), entry.value).not.toBe(unknown);
    }
  });

  it("read a legacy spelling as its canonical status, in the same colour", () => {
    // The vehicle wrote "Em Rota", routes wrote the raw enum before FLEET-ACT-1.
    expect(activityStatusLabel("PLANNED")).toBe("Planejada");
    expect(activityStatusLabel("Em Rota")).toBe("Em rota");
    expect(activityStatusClass("Em Rota")).toBe(activityStatusClass("Em rota"));
    expect(activityStatusClass("IN_PROGRESS")).toBe(
      activityStatusClass("Em andamento"),
    );

    // Something the catalog does not know is shown as written.
    expect(activityStatusLabel("Voando")).toBe("Voando");
  });

  it("name the app's driver 'Motorista' with a colour of its own", () => {
    expect(ACTIVITY_ROLE_LABELS.DRIVER).toBe("Motorista");
    expect(activityRoleClass("DRIVER")).not.toBe(
      activityRoleClass("BUSINESS_USER"),
    );
  });
});

describe("the filter options follow the contracted modules (FLEET-ACT-4)", () => {
  const values = (options: { value: string }[]) =>
    options.map((option) => option.value);

  it("a fleet-only company sees no Entregas status or type", () => {
    const statuses = values(activityStatusOptions(["FLEET"], false));
    const types = values(activityTypeOptions(["FLEET"], false));

    expect(statuses).toContain("Atualizado");
    expect(statuses).not.toContain("Entregue");
    expect(statuses).not.toContain("Planejada");
    expect(types).toContain("Abastecimento");
    expect(types).not.toContain("Entrega");
    expect(types).not.toContain("Rota");
  });

  it("a deliveries-only company sees the delivery and route statuses, and no fleet type", () => {
    const statuses = values(activityStatusOptions(["DELIVERIES"], false));
    const types = values(activityTypeOptions(["DELIVERIES"], false));

    for (const route of [
      "Planejada",
      "Liberada",
      "Em andamento",
      "Concluída",
      "Cancelada",
    ]) {
      expect(statuses).toContain(route);
    }

    expect(statuses).toContain("Entregue");
    expect(types).toContain("Rota");
    expect(types).not.toContain("Multa");
    // Vehicles and drivers serve both modules.
    expect(types).toContain("Veículo");
  });

  it("the MASTER sees every option, whatever the modules say", () => {
    expect(activityStatusOptions([], true)).toHaveLength(
      ACTIVITY_STATUS_CATALOG.length,
    );
    expect(activityTypeOptions(null, true)).toHaveLength(
      ACTIVITY_TYPE_CATALOG.length,
    );
  });

  it("without modules loaded, only the options every company has", () => {
    expect(isModuleOffered("CORE", null, false)).toBe(true);
    expect(isModuleOffered("FLEET", null, false)).toBe(false);
    expect(isModuleOffered("DELIVERIES", undefined, false)).toBe(false);
  });

  it("offers 'Motorista' as a role, and each reader the roles it can see", () => {
    const company = values(activityRoleOptions(false));
    const master = values(activityRoleOptions(true));

    expect(company).toEqual([
      "BUSINESS_ADMIN",
      "BUSINESS_USER",
      "DRIVER",
      "PLATFORM",
    ]);
    expect(master).toEqual([
      "MASTER",
      "BUSINESS_ADMIN",
      "BUSINESS_USER",
      "DRIVER",
    ]);
  });
});

describe("the table's server contract (FLEET-ACT-3)", () => {
  it("offers every catalog value as a facet, and orders by created_at only", () => {
    expect(ACTIVITY_TABLE.sortable).toEqual(["created_at"]);
    expect(ACTIVITY_TABLE.facets.status.values).toEqual(
      ACTIVITY_STATUS_CATALOG.map((entry) => entry.value),
    );
    expect(ACTIVITY_TABLE.facets.type.values).toEqual(
      ACTIVITY_TYPE_CATALOG.map((entry) => entry.value),
    );
    expect(ACTIVITY_TABLE.facets.userRole.param).toBe("role");
  });

  it("forwards the URL's filters to the API and drops what it does not offer", () => {
    const query = activityListQuery({
      status: "Entregue,Voando",
      role: "DRIVER",
      type: "Rota",
      sort: "created_at",
      order: "asc",
      page: "3",
    });

    expect(query).toMatchObject({
      status: "Entregue",
      role: "DRIVER",
      type: "Rota",
      sort: "created_at",
      order: "asc",
    });
    expect(query).not.toHaveProperty("page");
  });
});
