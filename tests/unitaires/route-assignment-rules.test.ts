import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The rules the route dialogs decide on their own (FLEET-ASSIGN-2,
 * DLVB-16, decisions 1.3/1.4), pure and through the hook the two assignment
 * dialogs share.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import {
  planTimeZone,
  responsibleLabel,
  suggestionToApply,
  vehicleStatusLabel,
  vehicleToPreselect,
} from "@/features/routes/lib/assignment";
import {
  companyDayOnViewerCalendar,
  formatPlannedWindow,
  routeDayAsLocalDate,
} from "@/features/routes/lib/route-dates";
import { cancelRouteCopy } from "@/features/routes/lib/cancel-copy";
import {
  useApplySuggestion,
  useVehiclePreselection,
} from "@/features/routes/assignment-preview";

beforeAll(() => {
  vi.stubGlobal("React", React);
});

describe("when a dialog may apply the preview's suggestion", () => {
  const base = {
    suggestedVehicleId: "truck",
    driverId: "joao",
    initialDriverId: "joao",
  };

  it("never while editing a route with its own driver", () => {
    expect(suggestionToApply({ ...base, isEditing: true })).toBeNull();
  });

  it("once the edit chose another driver, and always when planning", () => {
    expect(
      suggestionToApply({ ...base, isEditing: true, driverId: "maria" }),
    ).toBe("truck");
    expect(suggestionToApply({ ...base, isEditing: false })).toBe("truck");
    expect(
      suggestionToApply({
        ...base,
        isEditing: false,
        suggestedVehicleId: null,
      }),
    ).toBeNull();
  });
});

describe("the zone the plan's day rules are read in", () => {
  it("is the company's once known, the browser's until then", () => {
    expect(planTimeZone("America/Manaus")).toBe("America/Manaus");
    expect(planTimeZone(undefined)).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
});

describe("which vehicle to preselect", () => {
  it("takes the driver's only truck when nobody chose one", () => {
    expect(
      vehicleToPreselect({
        suggestedVehicleId: "v1",
        currentVehicleId: "",
        vehicleTouched: false,
      }),
    ).toBe("v1");
  });

  it("never replaces a choice, and does nothing without a suggestion", () => {
    expect(
      vehicleToPreselect({
        suggestedVehicleId: "v1",
        currentVehicleId: "v2",
        vehicleTouched: true,
      }),
    ).toBeNull();

    expect(
      vehicleToPreselect({
        suggestedVehicleId: null,
        currentVehicleId: "",
        vehicleTouched: false,
      }),
    ).toBeNull();

    expect(
      vehicleToPreselect({
        suggestedVehicleId: "v1",
        currentVehicleId: "v1",
        vehicleTouched: false,
      }),
    ).toBeNull();
  });
});

describe("what the vehicle picker says about each truck", () => {
  it("names the responsible relative to the driver being assigned", () => {
    expect(
      responsibleLabel({
        vehicleDriverId: "d1",
        vehicleDriverName: "João",
        chosenDriverId: "d1",
      }),
    ).toBe("Responsável: o motorista escolhido");

    expect(
      responsibleLabel({
        vehicleDriverId: "d2",
        vehicleDriverName: "Maria",
        chosenDriverId: "d1",
      }),
    ).toBe("Responsável: Maria");

    expect(
      responsibleLabel({
        vehicleDriverId: "d2",
        vehicleDriverName: undefined,
        chosenDriverId: "d1",
      }),
    ).toBe("Responsável: outro motorista");

    expect(
      responsibleLabel({
        vehicleDriverId: null,
        vehicleDriverName: null,
        chosenDriverId: "d1",
      }),
    ).toBeNull();
  });

  it("speaks Portuguese for the status", () => {
    expect(vehicleStatusLabel("IN_ROUTE")).toBe("Em rota");
    expect(vehicleStatusLabel("ACTIVE")).toBe("Ativo");
    expect(vehicleStatusLabel("BLOCKED")).toBe("Bloqueado");
  });
});

describe("the route's times", () => {
  it("bounds the calendars by the route's day on the local calendar", () => {
    const day = routeDayAsLocalDate("2026-09-17")!;

    expect([
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      day.getHours(),
    ]).toEqual([2026, 8, 17, 0]);
    expect(routeDayAsLocalDate("17/09/2026")).toBeUndefined();
    expect(routeDayAsLocalDate("")).toBeUndefined();
  });

  it("finds the company's day on the viewer's calendar, whatever the two zones", () => {
    // Same zone: the day itself.
    expect(
      companyDayOnViewerCalendar(
        "2026-09-17",
        "America/Sao_Paulo",
        "America/Sao_Paulo",
      ),
    ).toEqual({ first: "2026-09-17", last: "2026-09-17" });

    // A company west of the viewer: its 17th runs 02:00 → 01:59 of the 18th
    // in São Paulo, so 23:00 there (the 18th locally) is still on the day.
    expect(
      companyDayOnViewerCalendar(
        "2026-09-17",
        "America/Rio_Branco",
        "America/Sao_Paulo",
      ),
    ).toEqual({ first: "2026-09-17", last: "2026-09-18" });

    // A company east of the viewer: its 17th starts at 22:00 of the 16th in
    // Rio Branco.
    expect(
      companyDayOnViewerCalendar(
        "2026-09-17",
        "America/Sao_Paulo",
        "America/Rio_Branco",
      ),
    ).toEqual({ first: "2026-09-16", last: "2026-09-17" });

    // Across a month end.
    expect(
      companyDayOnViewerCalendar(
        "2026-09-30",
        "America/Manaus",
        "America/Noronha",
      ),
    ).toEqual({ first: "2026-09-30", last: "2026-10-01" });
  });

  it("gives no bounds rather than wrong ones for a bad day or zone", () => {
    expect(
      companyDayOnViewerCalendar(
        "17/09/2026",
        "America/Sao_Paulo",
        "America/Sao_Paulo",
      ),
    ).toBeUndefined();
    expect(
      companyDayOnViewerCalendar(
        "2026-09-17",
        "Mars/Olympus",
        "America/Sao_Paulo",
      ),
    ).toBeUndefined();
  });

  it("says the planned window on the browser's clock", () => {
    const at = (hour: number, minute = 0, day = 17) =>
      new Date(2026, 8, day, hour, minute).toISOString();

    expect(formatPlannedWindow(at(8), at(18, 30))).toBe("08:00 – 18:30");
    expect(formatPlannedWindow(at(8), null)).toBe("saída 08:00");
    expect(formatPlannedWindow(null, at(18))).toBe("retorno 18:00");
    expect(formatPlannedWindow(at(20), at(2, 0, 18))).toBe(
      "20:00 – 18/09 02:00",
    );
    expect(formatPlannedWindow(null, null)).toBeNull();
  });
});

describe("what cancelling a route says", () => {
  it("promises the driver a notice only once the route was handed over", () => {
    expect(
      cancelRouteCopy({ status: "PLANNED", openStops: 2 }).consequences,
    ).toContain(
      "O motorista não é avisado: a rota ainda não tinha sido liberada para ele.",
    );

    for (const status of ["RELEASED", "IN_PROGRESS"] as const) {
      expect(cancelRouteCopy({ status, openStops: 0 }).consequences).toContain(
        "O motorista é avisado no aplicativo (notificação e tela da rota).",
      );
    }
  });

  it("counts the stops it releases", () => {
    expect(
      cancelRouteCopy({ status: "RELEASED", openStops: 3 }).consequences,
    ).toContain(
      "As 3 paradas ainda não resolvidas são canceladas e as entregas voltam para a lista de entregas disponíveis, sem motorista.",
    );

    expect(
      cancelRouteCopy({ status: "RELEASED", openStops: 0 }).consequences.some(
        (line) => line.includes("paradas ainda não resolvidas"),
      ),
    ).toBe(false);
  });
});

describe("the preselection the dialogs share", () => {
  let root: Root | null = null;

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  interface Probe {
    vehicleId: string;
    chooseVehicle: (next: string) => void;
    onDriverChanged: () => void;
  }

  async function mountProbe(
    initial: string,
    suggestion: { current: string | null },
  ) {
    const probe = {} as Probe;
    let rerender: () => Promise<void> = async () => {};

    const Harness = () => {
      const selection = useVehiclePreselection(initial);

      useApplySuggestion(suggestion.current, selection.applySuggestion);

      Object.assign(probe, selection);

      return null;
    };

    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    rerender = async () => {
      await act(async () => root!.render(createElement(Harness)));
    };

    await rerender();

    return { probe, rerender };
  }

  it("follows the driver's truck until somebody chooses", async () => {
    const suggestion = { current: "truck-a" as string | null };
    const { probe, rerender } = await mountProbe("", suggestion);

    expect(probe.vehicleId).toBe("truck-a");

    // Another driver: the previous suggestion goes, the new one comes.
    await act(async () => probe.onDriverChanged());
    suggestion.current = "truck-b";
    await rerender();

    expect(probe.vehicleId).toBe("truck-b");

    // A person picks: nothing overrides it again.
    await act(async () => probe.chooseVehicle("truck-x"));
    await act(async () => probe.onDriverChanged());
    suggestion.current = "truck-c";
    await rerender();

    expect(probe.vehicleId).toBe("truck-x");
  });

  it("keeps the vehicle the dialog opened with", async () => {
    const { probe } = await mountProbe("truck-open", { current: "truck-a" });

    expect(probe.vehicleId).toBe("truck-open");
  });
});
