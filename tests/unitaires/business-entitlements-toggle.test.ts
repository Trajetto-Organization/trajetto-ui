import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * "Módulos Contratados": the switch after the MASTER turns a module on.
 *
 * The switch read only the refetch that follows the change, and that refetch
 * is a Server Action queued behind whatever the router is doing — the plan
 * change itself refreshes the MASTER's screens. In
 * tests/ui/journey-deliveries.spec.ts the toast said "Módulo da empresa
 * atualizado com sucesso!" while the switch stayed off for the whole 30 s
 * the test waited. The API's confirmation now moves the switch.
 *
 * The Server Actions are the network boundary here and are stubbed: the
 * reading of the module list answers once, and the refetch never comes back
 * (the queued case), so only the confirmation can move the switch.
 */
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// This runner compiles JSX with the classic runtime.
(globalThis as { React?: typeof React }).React = React;

const actions = vi.hoisted(() => ({
  reads: 0,
  updateResult: {
    success: true,
    message: "Módulo da empresa atualizado com sucesso!",
  } as {
    success: boolean;
    message: string;
  },
}));

vi.mock("@/actions/business/entitlements", () => ({
  getBusinessEntitlements: vi.fn(async () => {
    actions.reads += 1;

    if (actions.reads > 1) return new Promise(() => undefined);

    return {
      success: true,
      message: "",
      data: {
        modules: [
          { module: "FLEET", enabled: true },
          { module: "DELIVERIES", enabled: false },
        ],
        vehicle_limit: 10,
        vehicle_count: 0,
        vehicle_limit_enabled: false,
      },
    };
  }),
  updateBusinessEntitlement: vi.fn(async () => actions.updateResult),
  getModuleImpact: vi.fn(async () => ({
    success: true,
    message: "",
    data: { module: "FLEET", records: [], affectedUsers: 0, inFlight: [] },
  })),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { ManageEntitlementsForm } from "@/features/business-entitlements/manage-form";

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  actions.reads = 0;
});

async function mount(): Promise<void> {
  const host = document.createElement("div");

  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () =>
    root!.render(
      createElement(
        QueryClientProvider,
        {
          client: new QueryClient({
            defaultOptions: { queries: { retry: false } },
          }),
        },
        createElement(ManageEntitlementsForm, {
          businessId: "018f0000-0000-7000-8000-00000000000a",
          businessName: "Transportadora Jornada",
          isOpen: true,
          onClose: () => undefined,
        }),
      ),
    ),
  );
}

const deliveriesSwitch = (): HTMLButtonElement =>
  document.querySelector<HTMLButtonElement>(
    '[role="switch"][aria-label="Alternar módulo Entregas"]',
  )!;

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe("turning a module on", () => {
  it("the switch stays on when the API confirms, without waiting for the refetch", async () => {
    actions.updateResult = {
      success: true,
      message: "Módulo da empresa atualizado com sucesso!",
    };

    await mount();
    await settle();

    expect(deliveriesSwitch().getAttribute("aria-checked")).toBe("false");

    await act(async () => deliveriesSwitch().click());
    await settle();

    expect(actions.reads, "a releitura foi pedida (e não volta)").toBe(2);
    expect(deliveriesSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("a refusal leaves the switch as it was", async () => {
    actions.updateResult = {
      success: false,
      message: "Você não tem permissão para realizar esta ação.",
    };

    await mount();
    await settle();

    await act(async () => deliveriesSwitch().click());
    await settle();

    expect(deliveriesSwitch().getAttribute("aria-checked")).toBe("false");
  });
});
