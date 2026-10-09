import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Editar rota" sends what changed, as the API's partial update takes it
 * (DLVB-14).
 *
 * The API judges the window only when an edit touches it, so a route whose
 * stored times predate the rule (the old -3h storage bug put departures on
 * the previous evening) can still be renamed. The web always sent the day and
 * both times and re-judged them in the server action, so that route could not
 * be renamed without first fixing times nobody was editing.
 *
 * The real server action runs; only the cookie and the API are stubbed.
 */
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import { handleUpdateRoute } from "@/actions/route/update-route";
import {
  ROUTE_PLAN_MESSAGES,
  changedRouteFields,
} from "@/schemas/create-update-route-schema";

const BUSINESS = "018f0000-0000-7000-8000-00000000000b";
const ROUTE = "018f0000-0000-7000-8000-0000000000a7";
const DRIVER = "018f0000-0000-7000-8000-0000000000d1";

const sent: Array<Record<string, unknown>> = [];

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  sent.length = 0;

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));

    return new Response(JSON.stringify({ message: "Rota editada." }), {
      status: 200,
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The form as the dialog posts it for a route of the 17th whose stored
 * departure is 20:00 of the 16th in São Paulo — off the route's day.
 */
function legacyRouteForm(overrides: Record<string, string>): FormData {
  const values: Record<string, string> = {
    businessId: BUSINESS,
    routeId: ROUTE,
    plan_time_zone: "America/Sao_Paulo",
    name: "Zona  Sul",
    destination: "",
    driverId: DRIVER,
    vehicleId: "",
    scheduled_date: "2026-09-17",
    planned_departure_at: "2026-09-16T23:00:00.000Z",
    planned_arrival_at: "",
    ...overrides,
  };

  const form = new FormData();

  for (const [key, value] of Object.entries(values)) form.append(key, value);

  return form;
}

describe("renaming a route whose stored window predates the rule", () => {
  it("sends the destination alone, without re-judging the untouched times or name", async () => {
    // Red before: refused with "A saída prevista deve ser no dia da rota."
    // (and the legacy double space of the name), nothing sent.
    const result = await handleUpdateRoute(
      {},
      legacyRouteForm({
        destination: "CD Cajamar",
        changed_fields: "destination",
      }),
    );

    expect(result).toEqual({ successMessage: "Rota editada." });
    expect(sent).toEqual([{ destination: "CD Cajamar" }]);
  });

  it("judges the whole window as it will be once a time changes", async () => {
    // The departure moved onto the day: the plan is judged with the day and
    // return the route keeps, and only the departure is sent.
    const fixed = await handleUpdateRoute(
      {},
      legacyRouteForm({
        planned_departure_at: "2026-09-17T11:00:00.000Z",
        changed_fields: "planned_departure_at",
      }),
    );

    expect(fixed).toEqual({ successMessage: "Rota editada." });
    expect(sent).toEqual([
      { planned_departure_at: "2026-09-17T11:00:00.000Z" },
    ]);

    // Changing the return only still judges the stored departure, as the
    // API does against its stored values.
    const returnOnly = await handleUpdateRoute(
      {},
      legacyRouteForm({
        planned_arrival_at: "2026-09-17T21:00:00.000Z",
        changed_fields: "planned_arrival_at",
      }),
    );

    expect(returnOnly).toEqual({
      updateRouteError: {
        planned_departure_at: [ROUTE_PLAN_MESSAGES.departureOffDay],
      },
    });
    expect(sent).toHaveLength(1);
  });

  it("still checks a changed field by its own rules", async () => {
    const result = await handleUpdateRoute(
      {},
      legacyRouteForm({ name: "Zona  Norte", changed_fields: "name" }),
    );

    expect(result).toEqual({
      updateRouteError: {
        name: ["O nome da rota não deve conter espaços consecutivos."],
      },
    });
    expect(sent).toEqual([]);
  });

  it("clears what the dispatcher emptied, with null", async () => {
    await handleUpdateRoute(
      {},
      legacyRouteForm({
        planned_departure_at: "",
        changed_fields: "planned_departure_at",
      }),
    );

    expect(sent).toEqual([{ planned_departure_at: null }]);
  });

  it("keeps the whole-form path for a post without changed_fields", async () => {
    const result = await handleUpdateRoute(
      {},
      legacyRouteForm({ name: "Zona Sul" }),
    );

    expect(result).toEqual({
      updateRouteError: {
        planned_departure_at: [ROUTE_PLAN_MESSAGES.departureOffDay],
      },
    });
    expect(sent).toEqual([]);
  });
});

describe("what counts as a change", () => {
  const initial = {
    name: "Zona Sul",
    destination: "",
    driverId: DRIVER,
    vehicleId: "",
    scheduled_date: "2026-09-17",
    planned_departure_at: "2026-09-17T11:00:00.000Z",
    planned_arrival_at: "",
  };

  it("reads an instant as the moment, however it is spelled", () => {
    expect(
      changedRouteFields(
        { ...initial, planned_departure_at: "2026-09-17T08:00:00-03:00" },
        initial,
      ),
    ).toEqual([]);

    expect(
      changedRouteFields(
        { ...initial, planned_departure_at: "2026-09-17T08:30:00-03:00" },
        initial,
      ),
    ).toEqual(["planned_departure_at"]);
  });

  it("names every field that differs, and a time cleared or set", () => {
    expect(
      changedRouteFields(
        {
          ...initial,
          name: "Zona Norte",
          vehicleId: "018f0000-0000-7000-8000-0000000000e1",
          planned_departure_at: "",
          planned_arrival_at: "2026-09-17T21:00:00.000Z",
        },
        initial,
      ),
    ).toEqual([
      "name",
      "vehicleId",
      "planned_departure_at",
      "planned_arrival_at",
    ]);
  });
});
