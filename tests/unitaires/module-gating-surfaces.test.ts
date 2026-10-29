import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * A company without Gestão de Frotas sees nothing of the fleet, and one
 * without Entregas nothing of the deliveries (owner's check, 08/10/2026).
 *
 * The sidebar, ⌘K and the dashboard cards already derive from app-routes;
 * these are the surfaces that still spoke of the other module: Limites de
 * Uso (the fines card and the checklist note), the notification preferences
 * (fines, service orders and payables switches) and the dashboard tours.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

const plan = vi.hoisted(() => ({
  modules: [] as Array<{ module: string; enabled: boolean }>,
  failed: false,
}));

// The data source of the limits page; the card's own rendering is under test.
vi.mock(
  "@/app/(protected)/_components/shared/limits/limits-content/hooks",
  () => ({
    useLimitsContent: () => ({
      businessId: "018f0000-0000-7000-8000-00000000000a",
      isLoading: false,
      errorMessage: null,
      aiUsage: {
        ai_analysis_limit: 100,
        ai_analysis_used: 3,
        ai_analysis_in_progress: 0,
        ai_analysis_reset_at: "2026-10-01T03:00:00.000Z",
        ai_analysis_next_reset_at: "2026-11-01T03:00:00.000Z",
        ai_analysis_timezone: "America/Sao_Paulo",
        ai_analysis_used_by_type: { fuel: 0, checklist: 0, proof: 0 },
      },
      entitlements: plan.failed
        ? null
        : {
            modules: plan.modules,
            vehicle_limit: 10,
            vehicle_count: 4,
            vehicle_inactive_count: 0,
            vehicle_limit_enabled: true,
            vehicle_status_counts: {
              ACTIVE: 3,
              BLOCKED: 1,
              IN_ROUTE: 0,
              INACTIVE: 0,
            },
          },
      planStatus: plan.failed ? "error" : "ready",
    }),
  }),
);

// Server actions (network) the preferences screen and the alert sound call.
vi.mock("@/actions/notifications", () => ({
  updateNotificationPreferences: vi.fn(async () => ({ successMessage: "ok" })),
}));
vi.mock("@/actions/chat/tickets", () => ({
  getOpsAlertSound: vi.fn(async () => ({
    success: true,
    data: { sound: true },
  })),
  updateOpsAlertSound: vi.fn(async () => ({ success: true, message: "ok" })),
}));

import { LimitsContent } from "@/app/(protected)/_components/shared/limits/limits-content";
import { NotificationPreferences } from "@/app/(protected)/_components/profile/notifications/preferences";
import {
  rowsInPlan,
  whatsAppToggleCopy,
} from "@/app/(protected)/_components/profile/notifications/preferences/module-rules";
import {
  chartsTour,
  dashboardTour,
  limitsTour,
} from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data/dashboard";
import { useAuthStore } from "@/store/auth-store";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  useAuthStore.setState({ enabledModules: null });
  plan.failed = false;
});

const on = (...modules: string[]) =>
  ["FLEET", "DELIVERIES"].map((module) => ({
    module,
    enabled: modules.includes(module),
  }));

async function render(element: React.ReactElement): Promise<string> {
  const container = document.createElement("div");
  const root = createRoot(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
  });

  await act(async () => {
    root.render(createElement(QueryClientProvider, { client }, element));
  });

  return container.textContent ?? "";
}

const FLEET_WORDS =
  /multa|ordens? de servi|contas a pagar|manuten|abastec|checklist|peças|fornecedor/i;
const DELIVERY_WORDS = /entrega|rotas?\b|canhoto|ocorr/i;

describe("usage limits by module", () => {
  const renderLimits = () =>
    render(
      createElement(LimitsContent, {
        businessId: "018f0000-0000-7000-8000-00000000000a",
        mode: "dashboard",
        showBusinessSelector: false,
      }),
    );

  // Red before: the fines card and the checklist sentence showed to a
  // company that hired only Entregas.
  it("shows no fleet card or sentence to a deliveries-only company", async () => {
    plan.modules = on("DELIVERIES");
    const text = await renderLimits();

    expect(text).toContain("Fotos analisadas");
    expect(text).toContain("Cada foto lida conta uma vez.");
    expect(text).not.toMatch(FLEET_WORDS);
  });

  // Red before: with the plan request failed, the breakdown listed the
  // fleet's odometer and checklist rows to a deliveries-only company.
  it("falls back to the session's modules when the plan does not load", async () => {
    plan.failed = true;
    useAuthStore.setState({ enabledModules: ["DELIVERIES"] });
    const text = await renderLimits();

    expect(text).toContain("Canhotos de entrega");
    expect(text).not.toMatch(FLEET_WORDS);
  });

  it("keeps the fines card and the checklist sentence for a fleet company", async () => {
    plan.modules = on("FLEET");
    const text = await renderLimits();

    expect(text).toContain("Consulta de Multas");
    expect(text).toContain("Itens do checklist como combustível");
    // The vehicle breakdown without "Em rota" (only a route writes it).
    expect(text).toContain("Bloqueado");
    expect(text).not.toMatch(DELIVERY_WORDS);
  });

  it("lists the vehicles in route for a company with Entregas", async () => {
    plan.modules = on("DELIVERIES");
    const text = await renderLimits();

    expect(text).toContain("Em rota");
    expect(text).not.toMatch(FLEET_WORDS);
  });
});

describe("notification preferences by module", () => {
  const ROWS = (["FINES", "MAINTENANCE", "FINANCE", "TASKS"] as const).map(
    (category) => ({
      category,
      inApp: true,
      email: true,
      whatsapp: false,
      isDefault: true,
    }),
  );

  it("keeps only the categories the plan can produce", () => {
    expect(rowsInPlan(ROWS, ["DELIVERIES"]).map((row) => row.category)).toEqual(
      ["TASKS"],
    );
    expect(rowsInPlan(ROWS, ["FLEET"]).map((row) => row.category)).toEqual([
      "FINES",
      "MAINTENANCE",
      "FINANCE",
      "TASKS",
    ]);
    // Unknown plan is not a verdict.
    expect(rowsInPlan(ROWS, null)).toHaveLength(4);
  });

  // Red before: fines, service orders and payables switches showed to a
  // company without Gestão de Frotas.
  it("offers no fleet switch to a deliveries-only company", async () => {
    useAuthStore.setState({ enabledModules: ["DELIVERIES"] });

    const text = await render(
      createElement(NotificationPreferences, {
        initialPreferences: ROWS as never,
      }),
    );

    expect(text).toContain("Kanban");
    expect(text).not.toMatch(FLEET_WORDS);
  });

  it("offers every switch to a fleet company", async () => {
    useAuthStore.setState({ enabledModules: ["FLEET"] });

    const text = await render(
      createElement(NotificationPreferences, {
        initialPreferences: ROWS as never,
      }),
    );

    for (const label of [
      "Multas",
      "Ordens de serviço",
      "Contas a pagar",
      "Kanban",
    ]) {
      expect(text).toContain(label);
    }
  });

  it("does not promise fleet alerts on WhatsApp without the fleet module", () => {
    expect(
      whatsAppToggleCopy("BUSINESS_ADMIN", false, ["DELIVERIES"]),
    ).not.toMatch(FLEET_WORDS);
    expect(
      whatsAppToggleCopy("BUSINESS_USER", false, ["DELIVERIES"]),
    ).not.toMatch(FLEET_WORDS);
    expect(whatsAppToggleCopy("BUSINESS_ADMIN", false, ["FLEET"])).toContain(
      "multas",
    );
  });
});

describe("dashboard tours by module", () => {
  // Steps tied to one module are filtered by the engine: `requiresPath`, or
  // an optional step whose anchor only renders with that module.
  // "vehicle-limit-card" is NOT here on purpose: vehicles serve both
  // modules, so its step must stay neutral.
  const MODULE_ANCHORS = new Set([
    "bar-chart",
    "bar-chart-time-selector",
    "maintenance-status",
    "fine-lookup-card",
  ]);

  const sharedSteps = [...dashboardTour, ...chartsTour, ...limitsTour].filter(
    (step) =>
      !step.requiresPath && !(step.anchor && MODULE_ANCHORS.has(step.anchor)),
  );

  // Red before: "custos de manutenção", "ordens de serviço", "entregas,
  // rotas" and the checklist photos were told to every company.
  it("names neither module in the steps every company gets", () => {
    expect(sharedSteps.length).toBeGreaterThan(5);

    for (const step of sharedSteps) {
      const text = `${step.title} ${step.content}`;

      expect(text, step.title).not.toMatch(FLEET_WORDS);
      expect(text, step.title).not.toMatch(DELIVERY_WORDS);
    }
  });
});
