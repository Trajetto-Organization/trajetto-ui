import { describe, expect, it } from "vitest";

import {
  VEHICLE_SLOT_HIGH_USAGE_PERCENT,
  vehicleSlotLevel,
  vehicleSlotPercent,
} from "@/lib/vehicle-slot-usage";
import {
  VEHICLE_SLOTS_NOTE,
  VEHICLE_SLOT_BADGES,
  registeredTotalSentence,
  vehicleSlotsSentence,
  vehicleStatusRows,
} from "@/app/(protected)/_components/shared/limits/limits-content/lib/vehicle-slots-copy";
import { AI_HIGH_USAGE_PERCENT } from "@/app/(protected)/_components/shared/limits/limits-content/lib/ai-usage-copy";

/**
 * The "Veículos" card of Limites de Uso (spec §9): only what the API
 * answers — the contract, the fleet by status and the rule that INACTIVE
 * frees the slot — said in words that do not clash with the Vehicles page.
 */
const on = (...modules: string[]) =>
  ["FLEET", "DELIVERIES"].map((module) => ({
    module,
    enabled: modules.includes(module),
  }));

const counts = { ACTIVE: 3, BLOCKED: 1, IN_ROUTE: 0, INACTIVE: 2 };

describe("how full the contracted fleet is", () => {
  it("warns at 80% — the admin form's threshold — and keeps the AI card's 70%", () => {
    expect(VEHICLE_SLOT_HIGH_USAGE_PERCENT).toBe(80);
    expect(AI_HIGH_USAGE_PERCENT).toBe(70);
  });

  it.each([
    [0, 10, "ok"],
    [7, 10, "ok"],
    [79, 100, "ok"],
    [8, 10, "high"],
    [80, 100, "high"],
    [9, 10, "high"],
    [10, 10, "full"],
    [12, 10, "over"],
    [5, 0, "unlimited"],
  ] as const)("%i of %i is %s", (count, limit, level) => {
    expect(vehicleSlotLevel(count, limit)).toBe(level);
  });

  it("caps the bar at 100% when the fleet is over the contract", () => {
    expect(vehicleSlotPercent(12, 10)).toBe(100);
    expect(vehicleSlotPercent(3, 12)).toBe(25);
    expect(vehicleSlotPercent(3, 0)).toBe(0);
  });

  // "Ativo" sits as the first row of the breakdown: the badge must not use
  // the same word for "within the contract".
  it("never calls a level 'Ativo'", () => {
    expect(
      Object.values(VEHICLE_SLOT_BADGES).map((badge) => badge.label),
    ).toEqual([
      "Sem limite",
      "Dentro do limite",
      "Uso elevado",
      "Limite atingido",
      "Acima do limite",
    ]);
  });
});

describe("what is left of the contract", () => {
  // Red before: "5 vaga(s) restante(s) no plano".
  it("pluralizes the remaining slots", () => {
    expect(vehicleSlotsSentence(1, 6)).toBe("5 vagas restantes no plano");
    expect(vehicleSlotsSentence(5, 6)).toBe("1 vaga restante no plano");
    expect(vehicleSlotsSentence(0, 1500)).toBe(
      "1.500 vagas restantes no plano",
    );
  });

  it("says what is refused when the contract is full", () => {
    expect(vehicleSlotsSentence(6, 6)).toBe(
      "Todas as vagas do plano estão em uso — novos cadastros e reativações são recusados.",
    );
  });

  // Red before: a fleet above a lowered contract read as "full", with the
  // bar at 100% and no word of how far over it was.
  it("says by how much the fleet is over a lowered contract", () => {
    expect(vehicleSlotsSentence(7, 6)).toBe(
      "1 veículo acima do contratado — novos cadastros e reativações são recusados até a frota caber no plano.",
    );
    expect(vehicleSlotsSentence(9, 6)).toMatch(
      /^3 veículos acima do contratado/,
    );
  });

  it("says the registration is free with no limit configured", () => {
    expect(vehicleSlotsSentence(40, 0)).toBe(
      "Sem limite configurado: o cadastro de veículos está livre.",
    );
  });

  it("explains what counts against the plan without naming a module", () => {
    expect(VEHICLE_SLOTS_NOTE).toBe(
      "Ocupa vaga todo veículo que não está Inativo. Inativar um veículo libera a vaga e mantém o histórico.",
    );
    expect(VEHICLE_SLOTS_NOTE).not.toMatch(/entrega|rotas?\b|multa|manuten/i);
  });
});

describe("the fleet by status", () => {
  it("lists the slot-occupying statuses first, with the Vehicles page's labels", () => {
    expect(vehicleStatusRows(counts, on("FLEET", "DELIVERIES"))).toEqual([
      { key: "ACTIVE", label: "Ativo", count: 3, occupiesSlot: true },
      { key: "BLOCKED", label: "Bloqueado", count: 1, occupiesSlot: true },
      { key: "IN_ROUTE", label: "Em rota", count: 0, occupiesSlot: true },
      { key: "INACTIVE", label: "Inativo", count: 2, occupiesSlot: false },
    ]);
  });

  it("leaves 'Em rota' out for a fleet-only company with nobody in route", () => {
    expect(
      vehicleStatusRows(counts, on("FLEET")).map((row) => row.key),
    ).toEqual(["ACTIVE", "BLOCKED", "INACTIVE"]);
  });

  it("keeps 'Em rota' when a vehicle is in it, or the plan is unknown", () => {
    expect(
      vehicleStatusRows({ ...counts, IN_ROUTE: 2 }, on("FLEET")).map(
        (row) => row.key,
      ),
    ).toContain("IN_ROUTE");
    expect(vehicleStatusRows(counts, null).map((row) => row.key)).toContain(
      "IN_ROUTE",
    );
  });

  // An API older than the field answers without it: no rows, no zeros.
  it("lists nothing without the breakdown", () => {
    expect(vehicleStatusRows(undefined, on("FLEET"))).toEqual([]);
  });

  it("totals every registered vehicle", () => {
    expect(registeredTotalSentence(6)).toBe("Total cadastrado: 6 veículos");
    expect(registeredTotalSentence(1)).toBe("Total cadastrado: 1 veículo");
    expect(registeredTotalSentence(0)).toBe("Nenhum veículo cadastrado");
    // Without the breakdown the inactive ones are named in the footer.
    expect(registeredTotalSentence(6, 2)).toBe(
      "Total cadastrado: 6 veículos, 2 inativos",
    );
    expect(registeredTotalSentence(6, 1)).toBe(
      "Total cadastrado: 6 veículos, 1 inativo",
    );
  });
});
