import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import type {
  MonitoredRoute,
  MonitoredStop,
} from "@/actions/control-tower/types";

import {
  ROUTE_STOP_STATUS_META,
  currentOnTheWayStopId,
  routeStopMeta,
} from "@/features/routes/lib/status";
import {
  applyStopOnTheWay,
  isStopOnTheWay,
  onTheWayStopOf,
  progressOf,
  stopDot,
} from "@/features/deliveries/monitoring/lib/progress";
import {
  MESSAGE_SLOTS,
  TEMPLATE_VARIABLES,
  slotKey,
} from "@/features/deliveries/message-templates/lib/catalogue";

/**
 * "A caminho" on the web (decision 6.4): the route's stop list, the
 * monitoring dots and the "a caminho" message slots.
 *
 * The driver goes to one address at a time. Every stop that was ever marked
 * keeps its instant, but only the route's latest mark — while its stop is
 * still pending — is "a caminho". The rule is the API's
 * (mark-stop-on-the-way/on-the-way-rules.ts); the web mirrors it, and this
 * file runs both over the same cases when ../trajetto-api is checked out.
 */

const API_RULES = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "modules",
  "route",
  "usecases",
  "mark-stop-on-the-way",
  "on-the-way-rules.ts",
);

const API_TEMPLATE_SCHEMA = join(
  process.cwd(),
  "..",
  "trajetto-api",
  "src",
  "schemas",
  "delivery-message-template-schema",
  "index.ts",
);

type Case = {
  name: string;
  stops: Array<{ id: string; status: string; on_the_way_at: string | null }>;
  current: string | null;
};

const CASES: Case[] = [
  {
    name: "no mark",
    stops: [
      { id: "a", status: "PENDING", on_the_way_at: null },
      { id: "b", status: "PENDING", on_the_way_at: null },
    ],
    current: null,
  },
  {
    name: "the latest of two marks",
    stops: [
      { id: "a", status: "PENDING", on_the_way_at: "2026-09-29T13:00:00.000Z" },
      { id: "b", status: "PENDING", on_the_way_at: "2026-09-29T14:00:00.000Z" },
    ],
    current: "b",
  },
  {
    name: "the latest-marked stop reached: none, the older mark stays history",
    stops: [
      { id: "a", status: "PENDING", on_the_way_at: "2026-09-29T13:00:00.000Z" },
      { id: "b", status: "ARRIVED", on_the_way_at: "2026-09-29T14:00:00.000Z" },
    ],
    current: null,
  },
  {
    name: "the latest-marked stop delivered: none",
    stops: [
      { id: "a", status: "PENDING", on_the_way_at: "2026-09-29T13:00:00.000Z" },
      {
        id: "b",
        status: "COMPLETED",
        on_the_way_at: "2026-09-29T14:00:00.000Z",
      },
      { id: "c", status: "PENDING", on_the_way_at: null },
    ],
    current: null,
  },
  {
    name: "a tie goes to the greater id",
    stops: [
      { id: "b", status: "PENDING", on_the_way_at: "2026-09-29T13:00:00.000Z" },
      { id: "a", status: "PENDING", on_the_way_at: "2026-09-29T13:00:00.000Z" },
    ],
    current: "b",
  },
];

/**
 * The API's rules file, compiled and evaluated here. It imports nothing, so
 * it runs as it is; vite refuses to load a module outside this repository.
 */
function loadApiRules(): {
  currentOnTheWayStopId: (stops: Case["stops"]) => string | null;
} {
  const compiled = ts.transpileModule(readFileSync(API_RULES, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} as Record<string, unknown> };

  new Function("module", "exports", compiled)(module, module.exports);

  return module.exports as ReturnType<typeof loadApiRules>;
}

describe("the stop that is 'a caminho' right now", () => {
  it.each(CASES)("$name", ({ stops, current }) => {
    expect(currentOnTheWayStopId(stops)).toBe(current);
  });

  const hasApi = existsSync(API_RULES);

  it.skipIf(!hasApi)(
    `answers exactly what the API's rule answers${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
    () => {
      const api = loadApiRules();

      for (const { name, stops } of CASES) {
        expect(currentOnTheWayStopId(stops), name).toBe(
          api.currentOnTheWayStopId(stops),
        );
      }
    },
  );
});

describe("the route's stop list", () => {
  it("calls an untouched pending stop 'Pendente', not 'A caminho'", () => {
    // It read "A caminho" for every PENDING stop, before any driver said so.
    expect(ROUTE_STOP_STATUS_META.PENDING.label).toBe("Pendente");
    expect(routeStopMeta({ id: "a", status: "PENDING" }, null).label).toBe(
      "Pendente",
    );
  });

  it("shows 'A caminho' only on the driver's current stop", () => {
    const stops = CASES[1].stops as Array<{
      id: string;
      status: "PENDING";
      on_the_way_at: string | null;
    }>;
    const current = currentOnTheWayStopId(stops);

    expect(routeStopMeta(stops[0], current).label).toBe("Pendente");
    expect(routeStopMeta(stops[1], current).label).toBe("A caminho");
  });

  it("keeps the stop's own status once it moved on", () => {
    expect(routeStopMeta({ id: "b", status: "ARRIVED" }, "b").label).toBe(
      "No local",
    );
  });
});

function stop(
  id: string,
  overrides: Partial<MonitoredStop> = {},
): MonitoredStop {
  return {
    id,
    sequence: 10,
    status: "PENDING",
    deliveryId: `d-${id}`,
    recipientName: `Destinatário ${id}`,
    city: "Cuiabá",
    onTheWayAt: null,
    arrivedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function board(stops: MonitoredStop[]): MonitoredRoute[] {
  return [
    {
      id: "r1",
      code: 12,
      stops,
      progress: progressOf(stops),
    } as unknown as MonitoredRoute,
  ];
}

describe("the monitoring dots", () => {
  it("one blue dot per route: the previous mark turns grey", () => {
    const stops = [
      stop("a", { onTheWayAt: "2026-09-29T13:00:00.000Z" }),
      stop("b", { onTheWayAt: "2026-09-29T14:00:00.000Z" }),
    ];
    const current = onTheWayStopOf(stops);

    expect(stopDot(stops[0], current)).toBe("pending");
    expect(stopDot(stops[1], current)).toBe("on_the_way");

    // Both used to count, and both dots were blue.
    expect(progressOf(stops)).toMatchObject({ pending: 2, onTheWay: 1 });
  });

  it("patches the dot from the socket, and the previous one goes grey", () => {
    const before = board([
      stop("a", { onTheWayAt: "2026-09-29T13:00:00.000Z" }),
      stop("b"),
    ]);

    const event = {
      type: "route-stop.on_the_way",
      routeId: "r1",
      stopId: "b",
      stopStatus: "PENDING",
      onTheWayAt: "2026-09-29T14:00:00.000Z",
    };

    expect(isStopOnTheWay(event)).toBe(true);

    const [route] = applyStopOnTheWay(before, event as never);
    const current = onTheWayStopOf(route.stops);

    expect(route.stops[1].onTheWayAt).toBe("2026-09-29T14:00:00.000Z");
    expect(stopDot(route.stops[0], current)).toBe("pending");
    expect(stopDot(route.stops[1], current)).toBe("on_the_way");
    expect(route.progress.onTheWay).toBe(1);
  });

  it("never moves a stop back in time on an older event", () => {
    const before = board([
      stop("a", { onTheWayAt: "2026-09-29T14:00:00.000Z" }),
    ]);

    const [route] = applyStopOnTheWay(before, {
      type: "route-stop.on_the_way",
      routeId: "r1",
      stopId: "a",
      onTheWayAt: "2026-09-29T13:00:00.000Z",
    });

    expect(route.stops[0].onTheWayAt).toBe("2026-09-29T14:00:00.000Z");
  });

  it("answers the same array for a stop that is not on this page", () => {
    const before = board([stop("a")]);

    expect(
      applyStopOnTheWay(before, {
        type: "route-stop.on_the_way",
        routeId: "r1",
        stopId: "zzz",
        onTheWayAt: "2026-09-29T14:00:00.000Z",
      }),
    ).toBe(before);

    expect(
      applyStopOnTheWay(before, {
        type: "route-stop.on_the_way",
        routeId: "other",
        stopId: "a",
        onTheWayAt: "2026-09-29T14:00:00.000Z",
      }),
    ).toBe(before);
  });

  it("does not take a settled stop, or a frame without a readable instant, for a mark", () => {
    expect(
      isStopOnTheWay({
        type: "route-stop.settled",
        routeId: "r1",
        stopId: "a",
      }),
    ).toBe(false);
    expect(
      isStopOnTheWay({
        type: "route-stop.on_the_way",
        routeId: "r1",
        stopId: "a",
        onTheWayAt: "x",
      }),
    ).toBe(false);
  });
});

describe("the 'a caminho' message slots", () => {
  it("covers the four moments on both channels, once each", () => {
    const keys = MESSAGE_SLOTS.map((slot) => slotKey(slot.topic, slot.channel));

    expect(new Set(keys).size).toBe(8);
    expect(keys).toEqual(
      expect.arrayContaining(["ON_THE_WAY:WHATSAPP", "ON_THE_WAY:EMAIL"]),
    );
  });

  it("suggests only published variables, the link and, on WhatsApp, the way out", () => {
    const known = new Set<string>(TEMPLATE_VARIABLES);

    for (const slot of MESSAGE_SLOTS.filter(
      (entry) => entry.topic === "ON_THE_WAY",
    )) {
      const used = [
        ...slot.suggestion.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g),
      ].map((match) => match[1]);

      for (const name of used)
        expect(known, `${slot.title}: {{${name}}}`).toContain(name);

      expect(slot.suggestion).toContain("{{link}}");

      if (slot.channel === "WHATSAPP")
        expect(slot.suggestion).toContain("{{link_descadastro}}");
    }
  });

  const hasApi = existsSync(API_TEMPLATE_SCHEMA);

  it.skipIf(!hasApi)(
    `offers exactly the moments the API accepts${hasApi ? "" : " — skipped: ../trajetto-api is not checked out"}`,
    () => {
      const source = readFileSync(API_TEMPLATE_SCHEMA, "utf8");
      const block = /topic:\s*z\.enum\(\[([^\]]*)\]/.exec(source);

      expect(block, "the API's topic enum").not.toBeNull();

      const apiTopics = [...block![1].matchAll(/"([A-Z_]+)"/g)]
        .map((match) => match[1])
        .sort();
      const webTopics = [
        ...new Set(MESSAGE_SLOTS.map((slot) => slot.topic)),
      ].sort();

      expect(webTopics).toEqual(apiTopics);
    },
  );
});
