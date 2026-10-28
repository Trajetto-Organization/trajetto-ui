import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { VehicleSlotsCard } from "@/app/(protected)/_components/shared/limits/limits-content/vehicle-slots-card";
import type { BusinessEntitlementsData } from "@/actions/business/entitlements";

/**
 * The "Veículos" card in each state the plan can be in: loading, failed,
 * full, over the contract, without a limit, and from an API older than the
 * breakdown (rolling deploy).
 */
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

const FLEET = [
  { module: "FLEET", enabled: true },
  { module: "DELIVERIES", enabled: false },
];

function plan(
  overrides: Partial<BusinessEntitlementsData> = {},
): BusinessEntitlementsData {
  return {
    modules: FLEET,
    vehicle_limit: 6,
    vehicle_count: 1,
    vehicle_inactive_count: 0,
    vehicle_limit_enabled: true,
    vehicle_status_counts: { ACTIVE: 1, BLOCKED: 0, IN_ROUTE: 0, INACTIVE: 0 },
    ...overrides,
  };
}

async function render(
  props: React.ComponentProps<typeof VehicleSlotsCard>,
): Promise<HTMLElement> {
  const container = document.createElement("div");
  const root = createRoot(container);

  unmounts.push(async () => {
    await act(async () => root.unmount());
  });

  await act(async () => {
    root.render(createElement(VehicleSlotsCard, props));
  });

  return container;
}

describe("the Veículos card", () => {
  // Red before: while the plan was still on its way the card read
  // "Não foi possível carregar os dados da frota." and then changed its mind.
  it("shows a placeholder, not an error, while the plan has not answered", async () => {
    const card = await render({
      entitlements: null,
      planStatus: "loading",
      planModules: null,
    });

    expect(card.textContent).not.toContain("Não foi possível");
    expect(card.querySelector('[aria-busy="true"]')).not.toBeNull();
    // No verdict before the numbers.
    expect(card.textContent).not.toMatch(/limite/i);
  });

  it("says the plan failed only when it did", async () => {
    const card = await render({
      entitlements: null,
      planStatus: "error",
      planModules: null,
    });

    expect(card.textContent).toContain(
      "Não foi possível carregar os dados da frota.",
    );
  });

  // The case of the spec: "1 / 6" and "5 vaga(s) restante(s) no plano".
  it("reads 1 of 6 as a count, a bar, five slots and the breakdown", async () => {
    const card = await render({
      entitlements: plan(),
      planStatus: "ready",
      planModules: FLEET,
    });
    const text = card.textContent ?? "";

    expect(text).toContain("Dentro do limite");
    expect(text).toContain("Ocupando vaga1 / 6");
    expect(text).toContain("5 vagas restantes no plano");
    expect(
      card.querySelector('[role="progressbar"]')?.getAttribute("aria-label"),
    ).toBe("Vagas do plano em uso");
    expect(text).toContain("Total cadastrado: 1 veículo");
  });

  it("warns from 80% of the contract", async () => {
    const card = await render({
      entitlements: plan({
        vehicle_count: 5,
        vehicle_status_counts: {
          ACTIVE: 4,
          BLOCKED: 1,
          IN_ROUTE: 0,
          INACTIVE: 0,
        },
      }),
      planStatus: "ready",
      planModules: FLEET,
    });

    expect(card.textContent).toContain("Uso elevado");
    expect(card.textContent).toContain("1 vaga restante no plano");
  });

  it("says by how much a fleet is over a lowered contract", async () => {
    const card = await render({
      entitlements: plan({
        vehicle_count: 8,
        vehicle_status_counts: {
          ACTIVE: 8,
          BLOCKED: 0,
          IN_ROUTE: 0,
          INACTIVE: 0,
        },
      }),
      planStatus: "ready",
      planModules: FLEET,
    });

    expect(card.textContent).toContain("Acima do limite");
    expect(
      card.querySelector('[data-testid="vehicle-slots-sentence"]')?.textContent,
    ).toMatch(/^2 veículos acima do contratado/);
  });

  it("shows the count alone, and no bar, without a limit", async () => {
    const card = await render({
      entitlements: plan({ vehicle_limit: 0, vehicle_limit_enabled: false }),
      planStatus: "ready",
      planModules: FLEET,
    });

    expect(card.textContent).toContain("Sem limite");
    expect(card.textContent).toContain(
      "Sem limite configurado: o cadastro de veículos está livre.",
    );
    expect(card.querySelector('[role="progressbar"]')).toBeNull();
  });

  // API N-1 answers without vehicle_status_counts.
  it("falls back to the two numbers it always had from an older API", async () => {
    const card = await render({
      entitlements: plan({
        vehicle_count: 4,
        vehicle_inactive_count: 2,
        vehicle_status_counts: undefined,
      }),
      planStatus: "ready",
      planModules: FLEET,
    });

    expect(
      card.querySelector('[aria-label="Veículos por situação"]'),
    ).toBeNull();
    expect(card.textContent).toContain(
      "Total cadastrado: 6 veículos, 2 inativos",
    );
    expect(card.textContent).toContain("2 vagas restantes no plano");
  });
});
