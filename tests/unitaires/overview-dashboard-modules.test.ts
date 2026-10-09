import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "react-query";

import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import { renderHtml } from "./helpers/render-html";

import { Charts } from "@/app/(protected)/_components/overview-dashboard/charts";
import { showsFleetCharts } from "@/app/(protected)/_components/overview-dashboard/charts/visibility";
import { maintenanceStatusRows } from "@/app/(protected)/_components/overview-dashboard/charts/maintenance-status";
import {
  OperationPanel,
  operationGroups,
} from "@/app/(protected)/_components/overview-dashboard/operation-panel";

import type { DashboardData } from "@/app/(protected)/_components/overview-dashboard/shared/common.types";

/**
 * The overview for a company, by what it hired and what the day means.
 *
 * DASH-MOD-1: maintenance is Frotas — a deliveries-only company got an empty
 * "Custos de Manutenção" chart. DLVP-ADM-1: a series the API leaves out is
 * no line. DLVP-OPS-2: the operation block separates the open work (any date)
 * from what the company's day produced.
 */
const STATS = [
  { name: "Manutenção Pendente", value: 4, color: "#f97316" },
  { name: "Recém Manutenido", value: 9, color: "#22c55e" },
  { name: "Atrasado", value: 2, color: "#ef4444" },
];

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    counts: {} as DashboardData["counts"],
    deliveryOperation: null,
    vehicleStatus: [],
    maintenanceStats: STATS,
    activityTrends: [
      { month: "Ago", vehicles: 1, drivers: 2 },
      { month: "Set", vehicles: 3, drivers: 1 },
    ],
    recentActivity: [],
    vehiclesByType: [],
    maintenanceCosts: [
      { month: "Ago", internal: 0, external: 0 },
      { month: "Set", internal: 100, external: 50 },
    ],
    ...overrides,
  };
}

function renderCharts(
  showFleetCharts: boolean,
  data = dashboardData(),
): string {
  const client = new QueryClient();

  // Radix's portals warn about useLayoutEffect on a server render; only that
  // warning is silenced.
  const original = console.error;
  const quiet = vi.spyOn(console, "error").mockImplementation((...args) => {
    if (String(args[0]).includes("useLayoutEffect does nothing on the server"))
      return;
    original(...args);
  });

  try {
    return renderChartsHtml(client, showFleetCharts, data);
  } finally {
    quiet.mockRestore();
  }
}

function renderChartsHtml(
  client: QueryClient,
  showFleetCharts: boolean,
  data: DashboardData,
): string {
  return renderHtml(
    createElement(
      QueryClientProvider,
      { client },
      createElement(Charts, {
        dashboardData: data,
        userRole: "BUSINESS_ADMIN",
        showFleetCharts,
      }),
    ),
  );
}

describe("the fleet charts of the Análise Gráfica", () => {
  it("belong to a company that hired Frotas, and to the MASTER's platform view", () => {
    expect(showsFleetCharts("BUSINESS_ADMIN", ["DELIVERIES"])).toBe(false);
    expect(showsFleetCharts("BUSINESS_ADMIN", ["FLEET", "DELIVERIES"])).toBe(
      true,
    );
    expect(showsFleetCharts("MASTER", [])).toBe(true);

    // Unknown modules are not a verdict: the API still sends no costs.
    expect(showsFleetCharts("BUSINESS_ADMIN", null)).toBe(true);
  });

  it("are not drawn for a deliveries-only company", () => {
    const html = renderCharts(false);

    expect(html).not.toContain("Custos de Manutenção");
    expect(html).not.toContain("Manutenção da frota");
    expect(html).toContain("Tendências de Atividade");
  });

  it("are drawn, maintenance status included, for a fleet company", () => {
    const html = renderCharts(true);

    expect(html).toContain("Custos de Manutenção");
    expect(html).toContain("Manutenção da frota");
    expect(html).toContain("Atrasada");
  });

  it("show the overdue first, and keep a name they do not know", () => {
    const rows = maintenanceStatusRows([
      ...STATS,
      { name: "Outra situação", value: 1, color: "#000" },
    ]);

    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ["Atrasada", 2],
      ["A vencer", 4],
      ["Em dia", 9],
      ["Outra situação", 1],
    ]);
    expect(rows[0].attention).toBe(true);
  });

  it("draws no line for a series the API left out", () => {
    const html = renderCharts(false);

    // The points carry vehicles and drivers only: no "Entregas" legend.
    expect(html).toContain("Veículos");
    expect(html).not.toContain("Entregas");
    expect(html).not.toContain("Peças");
  });
});

describe("the operation block", () => {
  const operation = {
    unassigned: 4,
    designated: 2,
    inRoute: 3,
    deliveredToday: 7,
    failedToday: 1,
    occurrencesToday: 0,
  };

  it("separates the open work of any date from what the day produced", () => {
    const groups = operationGroups(operation);

    expect(
      groups.map((group) => [group.title, group.tiles.map((tile) => tile.key)]),
    ).toEqual([
      ["Agora", ["unassigned", "designated", "inRoute"]],
      ["Hoje", ["deliveredToday", "failedToday", "occurrencesToday"]],
    ]);

    const unassigned = groups[0].tiles[0];
    expect(unassigned.label).toBe("Sem rota");
    expect(unassigned.hint).toContain("qualquer data");

    // Designated is the tower's day now (DLV-MON-3, decision 7.1): the group
    // no longer promises "any date" nor "everything open right now" — stale
    // and routeless work with a driver is in no tile — and the tile says
    // whose day it is.
    expect(groups[0].description).not.toContain("qualquer data");
    expect(groups[0].description).not.toContain("aberto");
    expect(groups[0].description).toContain("rotas de hoje");
    expect(groups[0].tiles[1].hint).toContain("rotas de hoje");
  });

  it("flags what someone has to act on", () => {
    const flagged = operationGroups(operation)
      .flatMap((group) => group.tiles)
      .filter((tile) => tile.attention)
      .map((tile) => tile.key);

    expect(flagged).toEqual(["unassigned", "failedToday"]);
  });

  it("renders both groups with their numbers", () => {
    const html = renderHtml(
      createElement(OperationPanel, { operation, basePath: "/dashboard" }),
    );

    expect(html).toContain("Operação de hoje");
    expect(html).toContain('data-operation-group="now"');
    expect(html).toContain('data-operation-group="today"');
    expect(html).toContain("no fuso da empresa");
    expect(html).toContain('href="/dashboard/deliveries"');
  });
});
