import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Limites de Uso says only what the product does (decision 10.5, AI-10).
 *
 * Under the AI quota card sat an "Analytics de Uso — Em breve" card promising
 * charts of "verificações IA e consultas de multas": the fine lookup is out
 * of this version (its own card says so) and the quota counts photos.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock(
  "@/app/(protected)/_components/shared/limits/limits-content/hooks",
  () => ({
    useLimitsContent: () => ({
      businessId: "018f0000-0000-7000-8000-00000000000a",
      isLoading: false,
      errorMessage: null,
      aiUsage: {
        id: "018f0000-0000-7000-8000-00000000000a",
        corporate_reason: "Transportadora",
        fantasy_name: null,
        ai_analysis_limit: 100,
        ai_analysis_used: 12,
        ai_analysis_in_progress: 0,
        ai_analysis_reset_at: "2026-09-01T03:00:00.000Z",
        ai_analysis_next_reset_at: "2026-10-01T03:00:00.000Z",
        ai_analysis_timezone: "America/Sao_Paulo",
        ai_analysis_remaining: 88,
        ai_analysis_enabled: true,
        ai_analysis_used_by_type: { fuel: 2, checklist: 7, proof: 3 },
      },
      entitlements: {
        modules: [
          { module: "FLEET", enabled: true },
          { module: "DELIVERIES", enabled: true },
        ],
        vehicle_limit: 10,
        vehicle_count: 4,
        vehicle_inactive_count: 2,
        vehicle_limit_enabled: true,
        vehicle_status_counts: {
          ACTIVE: 1,
          BLOCKED: 2,
          IN_ROUTE: 1,
          INACTIVE: 2,
        },
      },
      planStatus: "ready",
    }),
  }),
);

import { LimitsContent } from "@/app/(protected)/_components/shared/limits/limits-content";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
});

describe("the usage limits page", () => {
  // Red before: the placeholder card promised fine-lookup analytics.
  it("promises nothing the product does not do", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    unmounts.push(async () => {
      await act(async () => root.unmount());
    });

    await act(async () => {
      root.render(
        createElement(LimitsContent, {
          businessId: "018f0000-0000-7000-8000-00000000000a",
          mode: "dashboard",
          showBusinessSelector: false,
        }),
      );
    });

    const text = container.textContent ?? "";

    expect(text).toContain("Fotos analisadas");
    expect(text).toContain("Canhotos de entrega");

    expect(text).not.toContain("Em breve");
    expect(text).not.toContain("Analytics de Uso");
    expect(text).not.toContain("consultas de multas");

    // The fines card promises no number: no quota, no usage.
    expect(text).toContain("não há cota nem consumo a acompanhar");
  });

  // Red before: "Veículos ativos 4" on a fleet of 1 Ativo + 2 Bloqueados +
  // 1 Em rota, while the Vehicles page reads "Veículos Ativos 1".
  it("names the vehicle slots for what they count, with the fleet by status", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    unmounts.push(async () => {
      await act(async () => root.unmount());
    });

    await act(async () => {
      root.render(
        createElement(LimitsContent, {
          businessId: "018f0000-0000-7000-8000-00000000000a",
          mode: "dashboard",
          showBusinessSelector: false,
        }),
      );
    });

    const card = container.querySelector(
      '[data-tutorial="vehicle-limit-card"]',
    );
    const text = card?.textContent ?? "";

    expect(text).toContain("Ocupando vaga");
    expect(text).not.toContain("Veículos ativos");
    expect(text).toContain("6 vagas restantes no plano");
    expect(text).not.toContain("vaga(s)");
    expect(text).toContain("Ocupa vaga todo veículo que não está Inativo.");
    expect(text).toContain("Total cadastrado: 6 veículos");

    const rows = [
      ...(card?.querySelectorAll('[aria-label="Veículos por situação"] li') ??
        []),
    ].map((row) => row.textContent);

    expect(rows).toEqual([
      "Ativo · ocupa vaga1",
      "Bloqueado · ocupa vaga2",
      "Em rota · ocupa vaga1",
      "Inativo · não ocupa vaga2",
    ]);

    // The fines card has its own anchor and opens the fines screen.
    const fines = container.querySelector('[data-tutorial="fine-lookup-card"]');

    expect(fines?.querySelector("a")?.getAttribute("href")).toBe(
      "/dashboard/fine",
    );
  });
});
