import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

// Server Actions behind the confirmation; only the text is proven here.
vi.mock("@/actions/fuel/delete-fuel", () => ({
  handleDeleteFuel: async () => ({}),
}));
vi.mock("@/actions/revalidate", () => ({ revalidateTagName: async () => {} }));

(globalThis as { React?: typeof React }).React = React;

import { FuelRulesAlert } from "@/features/fuel/form/context-panels";
import { DeleteFuelDialog } from "@/features/fuel/delete-dialog";

/**
 * The km rule the fuel form states before the fields, and what a delete
 * does to the vehicle (FLEET-FUEL-1).
 *
 * The API places every refueling by its date before it touches the vehicle.
 * The alert said a back-dated refueling "com data anterior a outros
 * registros" had to fit between its neighbours while the API still let one
 * above the vehicle through and moved the vehicle; nothing said a date-only
 * edit is checked, that a move gives the old vehicle its km back, or that a
 * delete does.
 */
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

function textOf(mode: "create" | "update"): string {
  act(() => root.render(createElement(FuelRulesAlert, { mode })));

  return container.textContent ?? "";
}

describe("FuelRulesAlert", () => {
  it("tells the edit that an older refueling fits between its neighbours", () => {
    const text = textOf("update");

    expect(text).toContain("entre a leitura anterior e a seguinte");
    expect(text).toContain("o veículo acompanha a correção");
    expect(text).not.toContain("exige um valor maior que o atual do veículo");
    // The rule about inactive links is still there.
    expect(text).toContain(
      "mesmo se o veículo ou o motorista estiverem inativos",
    );
  });

  it("tells the edit that a date change and a move are checked too", () => {
    const text = textOf("update");

    expect(text).toContain("Mudar só a data segue a mesma regra");
    expect(text).toContain("o veículo anterior volta à maior leitura restante");
  });

  it("tells the create the date decides first", () => {
    const text = textOf("create");

    expect(text).not.toContain(
      "Não é possível informar uma quilometragem menor",
    );
    expect(text).toContain(
      "Com registros em dias posteriores à data escolhida, a quilometragem precisa ficar entre a leitura anterior e a seguinte",
    );
    expect(text).toContain(
      "Sem registros em dias posteriores, a quilometragem precisa ser maior que a atual do veículo",
    );
    expect(text).toContain("O valor total é calculado automaticamente");
  });
});

describe("DeleteFuelDialog", () => {
  it("says the vehicle gets its km back when this refueling set it", async () => {
    await act(async () =>
      root.render(
        createElement(DeleteFuelDialog, {
          businessId: "018f0000-0000-7000-8000-00000000000a",
          fuelId: "018f0000-0000-7000-8000-0000000000f1",
          label: "ABC1D23 em 12/09/2026",
          isOpen: true,
          onClose: () => {},
        }),
      ),
    );

    // The confirmation renders in a portal, outside the container.
    expect(document.body.textContent).toContain(
      "Se era este abastecimento que definia a quilometragem atual do veículo, ela volta para a maior leitura restante.",
    );
  });
});
