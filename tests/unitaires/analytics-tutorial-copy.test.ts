import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";
import { createElement } from "react";

import {
  chartsTour,
  dashboardTour,
  limitsTour,
} from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data/dashboard";
import {
  MaintenanceStatus,
  maintenanceStatusRows,
} from "@/app/(protected)/_components/overview-dashboard/charts/maintenance-status";
import {
  MAINTENANCE_DUE_SOON_DAYS,
  unrecordedSentence,
} from "@/app/(protected)/_components/overview-dashboard/charts/maintenance-status/rules";
import { costComparison } from "@/app/(protected)/_components/overview-dashboard/charts/bar-chart/cost-comparison";

/**
 * Análise Gráfica and Limites de Uso explain what they show (spec §8), in
 * the words of the rule the API applies — not a paraphrase that drifts.
 *
 * The tour skipped "Manutenção da frota" and the Veículos and Consulta de
 * Multas cards; the AI step promised that analyses "esperam o próximo
 * período" (they are recorded as not done and retried by hand); the trends
 * never said they count new records; the costs footer called the running
 * month against the last one "no período" and drew a rise in cost in green.
 */
const API_MAINTENANCE_RULE = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "dashboard",
  "repositories",
  "maintenance-standing.ts",
);

const hasApi = existsSync(API_MAINTENANCE_RULE);

const stepOf = (tour: typeof chartsTour, anchor: string) => {
  const step = tour.find((entry) => entry.anchor === anchor);

  if (!step) throw new Error(`no step for ${anchor}`);

  return step;
};

describe.skipIf(!hasApi)(
  `the maintenance thresholds match the API's${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
  () => {
    it("reads 'A vencer' up to the same number of days", () => {
      const source = readFileSync(API_MAINTENANCE_RULE, "utf8");
      const days = /const DUE_SOON_DAYS = (\d+);/.exec(source)?.[1];

      expect(Number(days)).toBe(MAINTENANCE_DUE_SOON_DAYS);
    });
  },
);

describe("the Análise Gráfica tour", () => {
  it("walks the cards in the order they render", () => {
    expect(chartsTour.map((step) => step.anchor ?? "(boas-vindas)")).toEqual([
      "(boas-vindas)",
      "area-chart",
      "area-chart-time-selector",
      "maintenance-status",
      "bar-chart",
      "bar-chart-time-selector",
      "overview-tab",
    ]);
  });

  // Red before: no step for the card at all.
  it("explains the three maintenance states with the real thresholds", () => {
    const step = stepOf(chartsTour, "maintenance-status");

    // The card renders only with Gestão de Frotas (or for the MASTER).
    expect(step.optional).toBe(true);

    for (const words of [
      "Atrasada",
      "A vencer",
      "Em dia",
      "sem registro",
      "inclusive os inativos",
      "vencer hoje ainda não é atraso",
      `próximos ${MAINTENANCE_DUE_SOON_DAYS} dias`,
      `depois de ${MAINTENANCE_DUE_SOON_DAYS} dias`,
      "mesmo que a quilometragem já tenha passado",
    ]) {
      expect(step.content).toContain(words);
    }
  });

  it("says the trends count new records by creation date", () => {
    const step = stepOf(chartsTour, "area-chart");

    expect(step.content).toContain("pela data de cadastro");
    expect(step.content).toContain("não é o total acumulado");
  });

  it("says what the costs footer compares, and how a rise is coloured", () => {
    const step = stepOf(chartsTour, "bar-chart");

    expect(step.content).toContain("cadastrada");
    expect(step.content).toContain("período em andamento");
    expect(step.content).toContain("aumento de custo aparece em amarelo");
  });

  it("does not claim the MASTER's platform numbers are one company's", () => {
    expect(chartsTour[0].content).not.toContain("da empresa");
  });
});

describe("the Limites de Uso tour", () => {
  // Red before: only the AI card had a step.
  it("covers each card, in the order they render", () => {
    expect(limitsTour.map((step) => step.anchor).filter(Boolean)).toEqual([
      "ai-usage-card",
      "vehicle-limit-card",
      "fine-lookup-card",
      "overview-tab",
    ]);
  });

  // Red before: "Com o limite atingido, novas análises esperam o próximo
  // período." — a denied request is recorded SKIPPED and never revived by
  // itself (ai-analysis-service: "the verificar novamente path").
  it("says what happens at the AI limit as the pipeline does it", () => {
    const step = stepOf(limitsTour, "ai-usage-card");

    expect(step.content).not.toMatch(/esperam o próximo período/);
    expect(step.content).toContain("Verificar novamente com IA");
    expect(step.content).toContain("Uso elevado (a partir de 70%)");
  });

  it("explains the vehicle slots with the card's own words and threshold", () => {
    const step = stepOf(limitsTour, "vehicle-limit-card");

    expect(step.content).toContain(
      "Ocupa vaga todo veículo que não está Inativo",
    );
    expect(step.content).toContain("Uso elevado (a partir de 80%)");
    expect(step.content).toContain("Acima do limite");
    expect(step.content).toContain(
      "novos cadastros e reativações são recusados",
    );
  });

  it("keeps the fines step honest and tied to its card", () => {
    const step = stepOf(limitsTour, "fine-lookup-card");

    expect(step.optional).toBe(true);
    expect(step.content).toContain("não faz parte desta versão");
    expect(step.content).toContain("não há cota nem consumo");
  });

  it("is announced by the dashboard tour as quotas and slots", () => {
    const tabs = dashboardTour.find((step) => step.anchor === "dashboard-tabs");

    expect(tabs?.content).toContain(
      "Limites de Uso: as cotas e as vagas do plano",
    );
  });
});

describe("the Manutenção da frota card", () => {
  const stats = [
    { name: "Manutenção Pendente", value: 4, color: "#f97316", unrecorded: 2 },
    { name: "Recém Manutenido", value: 9, color: "#22c55e" },
    { name: "Atrasado", value: 1, color: "#ef4444" },
  ];

  it("says how many of 'A vencer' only lack the record", () => {
    const rows = maintenanceStatusRows(stats);

    expect(rows.find((row) => row.label === "A vencer")?.detail).toBe(
      "inclui 2 sem registro",
    );
    expect(rows.find((row) => row.label === "Em dia")?.detail).toBe("");
    expect(unrecordedSentence(0)).toBe("");
    expect(unrecordedSentence(undefined)).toBe("");
  });

  it("renders its anchor, the sub-count and the thresholds", () => {
    const html = renderHtml(createElement(MaintenanceStatus, { stats }));

    expect(html).toContain('data-tutorial="maintenance-status"');
    expect(html).toContain("inclui 2 sem registro");
    expect(html).toContain(
      `Vence em até ${MAINTENANCE_DUE_SOON_DAYS} dias ou está sem registro de revisão`,
    );
    expect(html).toContain("inclusive os inativos");
  });
});

describe("the costs footer", () => {
  const point = (month: string, internal: number, external = 0) => ({
    month,
    internal,
    external,
  });

  it("names both points and says the last one is still running", () => {
    expect(costComparison([point("Set", 100), point("Out", 150)])).toEqual({
      trend: "up",
      percent: 50,
      text: "Out (em andamento) × Set: aumento de 50%",
    });
    expect(costComparison([point("Set", 200), point("Out", 50)])).toEqual({
      trend: "down",
      percent: -75,
      text: "Out (em andamento) × Set: redução de 75%",
    });
  });

  // Red before: "Sem variação no período" while the running month had costs.
  it("does not invent a percentage over nothing", () => {
    expect(costComparison([point("Set", 0), point("Out", 80)])).toMatchObject({
      trend: "none",
      percent: null,
      text: "Out (em andamento) × Set: sem custos em Set para comparar",
    });
    expect(costComparison([point("Out", 80)]).trend).toBe("none");
    expect(costComparison([point("Set", 0), point("Out", 0)])).toMatchObject({
      trend: "flat",
      text: "Out (em andamento) × Set: sem custos nos dois períodos",
    });
  });

  it("reads the daily points by their date", () => {
    expect(
      costComparison([
        { date: "27 de out.", internal: 10, external: 0 },
        { date: "28 de out.", internal: 10, external: 0 },
      ]).text,
    ).toBe("28 de out. (em andamento) × 27 de out.: sem variação");
  });
});
