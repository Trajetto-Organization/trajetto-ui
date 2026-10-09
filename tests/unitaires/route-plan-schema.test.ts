import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ROUTE_PLAN_MESSAGES,
  assignRoutePlanSchema,
  createUpdateRouteSchema,
} from "@/schemas/create-update-route-schema";

/**
 * The route's plan as the web validates it (decisions 1.3, 1.4, 6.5),
 * mirroring trajetto-api's route schema and route-plan-rules message for
 * message — the header used to claim that parity while the API had only
 * `max(80)` on the name and no window rule at all.
 */
const DRIVER = "018f0000-0000-7000-8000-0000000000d1";

const base = { driverId: DRIVER, scheduled_date: "2026-09-17" };

const issuesOf = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) =>
  result.success ? [] : result.error!.issues.map((issue) => issue.message);

describe("the planned times", () => {
  it("take an ISO instant with offset, the DateTimePickerField's value", () => {
    const parsed = createUpdateRouteSchema.parse({
      ...base,
      planned_departure_at: "2026-09-17T11:00:00.000Z",
      planned_arrival_at: "",
      plan_time_zone: "America/Sao_Paulo",
    });

    expect(parsed.planned_departure_at).toBe("2026-09-17T11:00:00.000Z");
    expect(parsed.planned_arrival_at).toBeNull();
  });

  it("refuse the datetime-local wall time that used to be posted", () => {
    // Red before: any string passed, and the API read "2026-09-17T08:00" in
    // the container's zone (UTC) — three hours early.
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          planned_departure_at: "2026-09-17T08:00",
        }),
      ),
    ).toEqual([
      "A saída prevista deve ter data, hora e fuso (ex.: 2026-09-17T08:00:00-03:00).",
    ]);
  });

  it("refuse a return before the departure", () => {
    // Red before: no rule on either side.
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          planned_departure_at: "2026-09-17T15:00:00.000Z",
          planned_arrival_at: "2026-09-17T14:00:00.000Z",
          plan_time_zone: "America/Sao_Paulo",
        }),
      ),
    ).toEqual([ROUTE_PLAN_MESSAGES.arrivalBeforeDeparture]);
  });

  it("read the departure's day in the zone that travels with the form, even on the server", () => {
    // 22:30 of the 17th in São Paulo is 01:30Z of the 18th. The server
    // action runs in UTC; with the plan's zone the evening is the 17th.
    const evening = {
      ...base,
      planned_departure_at: "2026-09-18T01:30:00.000Z",
    };

    expect(
      createUpdateRouteSchema.safeParse({
        ...evening,
        plan_time_zone: "America/Sao_Paulo",
      }).success,
    ).toBe(true);

    // The same instant read in UTC would be the 18th: refused, which is
    // exactly why the zone travels with the form.
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...evening,
          plan_time_zone: "UTC",
        }),
      ),
    ).toEqual([ROUTE_PLAN_MESSAGES.departureOffDay]);
  });

  it("judge the day in the COMPANY's zone the preview answers, not the browser's", () => {
    // 00:30 of the 18th in São Paulo (a MASTER's browser) is 23:30 of the
    // 17th in Manaus (the company): the API accepts it for the route of the
    // 17th, and so must the form. Red before: the browser's zone refused it.
    const lateNight = {
      ...base,
      planned_departure_at: "2026-09-18T03:30:00.000Z",
      plan_time_zone: "America/Manaus",
    };

    expect(createUpdateRouteSchema.safeParse(lateNight).success).toBe(true);
  });

  it("refuse a return alone before the route's day, with the API's words", () => {
    // Red before: with no departure the return was not judged at all.
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          planned_arrival_at: "2026-09-16T18:00:00.000Z",
          plan_time_zone: "America/Sao_Paulo",
        }),
      ),
    ).toEqual(["O retorno previsto não pode ser antes do dia da rota."]);

    // One refusal per field: before the departure says only that.
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          planned_departure_at: "2026-09-17T15:00:00.000Z",
          planned_arrival_at: "2026-09-16T15:00:00.000Z",
          plan_time_zone: "America/Sao_Paulo",
        }),
      ),
    ).toEqual([ROUTE_PLAN_MESSAGES.arrivalBeforeDeparture]);
  });
});

describe("the route's day", () => {
  it("is a civil date, YYYY-MM-DD", () => {
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          scheduled_date: "2026-09-17T03:00:00.000Z",
        }),
      ),
    ).toEqual(["A data da rota deve estar no formato AAAA-MM-DD."]);

    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          scheduled_date: "2026-02-30",
        }),
      ),
    ).toEqual(["A data da rota é inválida."]);

    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({ ...base, scheduled_date: "" }),
      ),
    ).toEqual(["A data da rota é obrigatória."]);
  });
});

describe("the free texts", () => {
  it("apply the product's text rules to the name and the destination", () => {
    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          destination: " CD Cajamar",
        }),
      ),
    ).toEqual(["O destino não pode começar ou terminar com espaço em branco."]);

    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({
          ...base,
          destination: "x".repeat(161),
        }),
      ),
    ).toEqual(["O destino deve ter no máximo 160 caracteres."]);

    expect(
      issuesOf(
        createUpdateRouteSchema.safeParse({ ...base, name: "Zona  Sul" }),
      ),
    ).toEqual(["O nome da rota não deve conter espaços consecutivos."]);

    expect(
      createUpdateRouteSchema.parse({ ...base, destination: "" }).destination,
    ).toBeNull();
  });
});

describe("the assignment's plan", () => {
  it("takes the same fields under the same rules", () => {
    const refused = assignRoutePlanSchema.safeParse({
      scheduled_date: "2026-09-17",
      destination: "Zona Leste",
      planned_departure_at: "2026-09-17T20:00:00.000Z",
      planned_arrival_at: "2026-09-17T11:00:00.000Z",
    });

    expect(issuesOf(refused)).toEqual([
      ROUTE_PLAN_MESSAGES.arrivalBeforeDeparture,
    ]);
  });
});

describe("parity with the API", () => {
  // Read from the sibling repository when it is checked out, as the other
  // cross-repository guards do.
  const apiRules = resolve(
    __dirname,
    "../../../trajetto-api/src/shared/route/route-plan-rules.ts",
  );
  const apiSchema = resolve(
    __dirname,
    "../../../trajetto-api/src/schemas/route-schema/index.ts",
  );

  const available = existsSync(apiRules) && existsSync(apiSchema);

  it.skipIf(!available)(
    "says the window's refusals with the API's exact words — skipped: ../trajetto-api is not checked out",
    () => {
      const rules = readFileSync(apiRules, "utf8");

      for (const message of Object.values(ROUTE_PLAN_MESSAGES)) {
        expect(rules).toContain(message);
      }
    },
  );

  it.skipIf(!available)(
    "says the day's and the times' refusals with the API's exact words",
    () => {
      const schema = readFileSync(apiSchema, "utf8");

      for (const message of [
        "A data da rota deve estar no formato AAAA-MM-DD.",
        "A data da rota é inválida.",
        "deve ter data, hora e fuso (ex.: 2026-09-17T08:00:00-03:00).",
        "não pode conter apenas espaços.",
        "não deve conter espaços consecutivos.",
        "não pode começar ou terminar com espaço em branco.",
      ]) {
        expect(schema).toContain(message);
      }
    },
  );
});
