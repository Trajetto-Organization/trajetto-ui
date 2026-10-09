import { describe, expect, it } from "vitest";

import {
  isSameOrder,
  isStopDraggable,
  moveTo,
  reconcileOrder,
  stopMoveAnnouncement,
} from "@/features/routes/lib/stop-order";
import {
  mapBounds,
  missingLocationLabel,
  stopMarkers,
} from "@/features/routes/lib/route-map-points";
import {
  addStopsBlocker,
  releaseBlocker,
  stopsBlocker,
} from "@/features/routes/lib/route-blockers";
import {
  routeDetailHref,
  routesBoardHref,
} from "@/features/routes/lib/route-links";
import {
  addToRouteBlocker,
  movingSummary,
  planSelection,
} from "@/features/routes/lib/add-to-route";
import { routeEventDecision } from "@/features/routes/lib/route-event-decision";
import { createOwnPlanWrites } from "@/features/routes/lib/own-plan-writes";
import { leavesPage } from "@/features/routes/lib/leave-guard";
import {
  DEFAULT_PICKER_FILTERS,
  chunk,
  pickerQuery,
  toggleValue,
} from "@/features/routes/lib/unrouted-picker";
import { isPlanConflict } from "@/features/routes/lib/plan-conflict";
import { stopListAccessibility } from "@/features/routes/lib/stop-announcements";
import { parsePosition } from "@/features/routes/detail-page/move-to-position-dialog";

/**
 * The route page's rules (decision 14.7), pure: an off-by-one in the order,
 * a stop drawn at the wrong number, a release offered when the API will
 * refuse it, or a hint about another route refetching this one are bugs
 * that do not throw and do not look wrong — they are found on the road.
 */

const permission = { canWrite: true, message: "Sem permissão de escrita." };

describe("the local order (D6)", () => {
  it("moves one stop to any position and refuses out of range", () => {
    expect(moveTo(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveTo(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveTo(["a", "b"], 0, 2)).toBeNull();
    expect(moveTo(["a", "b"], -1, 0)).toBeNull();
  });

  it("drops a local order whose set of stops the server no longer has", () => {
    expect(reconcileOrder(["a", "b", "c"], ["c", "a", "b"])).toEqual([
      "c",
      "a",
      "b",
    ]);

    // A colleague added "d": the local order describes another route.
    expect(reconcileOrder(["a", "b", "c", "d"], ["c", "a", "b"])).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(reconcileOrder(["a", "b"], null)).toEqual(["a", "b"]);
    expect(isSameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(isSameOrder(["a", "b"], ["b", "a"])).toBe(false);
  });

  it("lets only a pending stop of an editable route be dragged", () => {
    expect(isStopDraggable("PENDING", true)).toBe(true);
    expect(isStopDraggable("ARRIVED", true)).toBe(false);
    expect(isStopDraggable("PENDING", false)).toBe(false);
  });

  it("reads a typed position only inside the list", () => {
    expect(parsePosition("3", 5)).toBe(3);
    expect(parsePosition(" 5 ", 5)).toBe(5);
    expect(parsePosition("0", 5)).toBeNull();
    expect(parsePosition("6", 5)).toBeNull();
    expect(parsePosition("2a", 5)).toBeNull();
  });

  it("announces a move in Portuguese, by name and position, never by id", () => {
    const { announcements } = stopListAccessibility([
      { id: "s1", title: "NF 10 · Maria" },
      { id: "s2", title: "NF 11 · João" },
    ]);

    expect(
      announcements.onDragEnd({
        active: { id: "s1" },
        over: { id: "s2" },
      } as never),
    ).toBe(stopMoveAnnouncement("NF 10 · Maria", 2, 2));
    expect(stopMoveAnnouncement("NF 10 · Maria", 2, 2)).toBe(
      "NF 10 · Maria movida para a posição 2 de 2.",
    );
  });
});

describe("the map's points (§5.4)", () => {
  const stop = (id: string, latitude: number | null, status = "PENDING") => ({
    id,
    status,
    delivery: {
      id: `d-${id}`,
      recipient_name: `Cliente ${id}`,
      latitude,
      longitude: latitude === null ? null : -46.6,
    },
  });

  it("numbers by the order on screen and lists the ones with no point", () => {
    const { markers, missing } = stopMarkers(
      [stop("a", -23.5), stop("b", null), stop("c", -23.6)],
      ["c", "b", "a"],
    );

    expect(markers.map((marker) => [marker.stopId, marker.position])).toEqual([
      ["c", 1],
      ["a", 3],
    ]);
    expect(missing.map((entry) => entry.id)).toEqual(["b"]);
    expect(missingLocationLabel(missing.length)).toBe(
      "1 entrega sem localização",
    );
    expect(missingLocationLabel(3)).toBe("3 entregas sem localização");
    expect(missingLocationLabel(0)).toBeNull();
  });

  it("leaves a cancelled stop off the plan", () => {
    const { markers, missing } = stopMarkers(
      [stop("a", -23.5, "CANCELLED")],
      ["a"],
    );

    expect(markers).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("frames only what has a point, and nothing when nothing has", () => {
    expect(
      mapBounds([
        { latitude: -23.5, longitude: -46.6 },
        null,
        { latitude: -22.9, longitude: -43.2 },
      ]),
    ).toEqual({ south: -23.5, west: -46.6, north: -22.9, east: -43.2 });
    expect(mapBounds([null, undefined])).toBeNull();
  });
});

describe("what a route allows (§5.2)", () => {
  const route = (overrides = {}) => ({
    status: "PLANNED" as const,
    vehicleId: "v1",
    stops: [{ status: "PENDING" as const }],
    ...overrides,
  });

  it("says why a release is blocked, in the order it would be hit", () => {
    expect(releaseBlocker(route(), permission)).toBeNull();
    expect(releaseBlocker(route({ vehicleId: null }), permission)).toBe(
      "Defina o veículo da rota antes de liberá-la.",
    );
    // Only cancelled stops: nothing to hand over.
    expect(
      releaseBlocker(route({ stops: [{ status: "CANCELLED" }] }), permission),
    ).toBe("Adicione ao menos uma parada antes de liberar a rota.");
    expect(
      releaseBlocker(route(), {
        canWrite: false,
        message: "Sem permissão de escrita.",
      }),
    ).toBe("Sem permissão de escrita.");
  });

  it("locks the stops once the route left, and the picker at 200", () => {
    expect(stopsBlocker(route({ status: "IN_PROGRESS" }), permission)).toMatch(
      /depois da saída/,
    );

    const full = route({
      stops: Array.from({ length: 200 }, () => ({
        status: "PENDING" as const,
      })),
    });

    expect(addStopsBlocker(full, permission)).toBe(
      "Uma rota tem no máximo 200 paradas abertas.",
    );
    expect(addStopsBlocker(route(), permission)).toBeNull();
  });
});

describe("the route page's address (D12)", () => {
  it("stays in the area the user is in, with the MASTER's company", () => {
    expect(routeDetailHref("/dashboard/deliveries", "r1", "b1")).toBe(
      "/dashboard/routes/r1",
    );
    expect(routeDetailHref("/admin/deliveries", "r1", "b1")).toBe(
      "/admin/routes/r1?businessId=b1",
    );
    expect(routesBoardHref("/admin/routes/r1", "b1")).toBe(
      "/admin/routes?businessId=b1",
    );
    expect(routesBoardHref("/dashboard/routes/r1", null)).toBe(
      "/dashboard/routes",
    );
  });
});

describe("Adicionar à rota from the table (D9, §5.6)", () => {
  const stops = [
    { deliveryId: "d2", routeId: "r9", routeCode: 9, routeStatus: "RELEASED" },
    { deliveryId: "d3", routeId: "r9", routeCode: 9, routeStatus: "PLANNED" },
    {
      deliveryId: "d4",
      routeId: "r5",
      routeCode: 5,
      routeStatus: "IN_PROGRESS",
    },
    { deliveryId: "d5", routeId: "r1", routeCode: 1, routeStatus: "PLANNED" },
  ];

  it("splits the selection into joining, moving, already there and blocked", () => {
    const plan = planSelection(
      ["d1", "d2", "d3", "d4", "d5", "d1"],
      stops,
      "r1",
    );

    expect(plan).toEqual({
      free: ["d1"],
      moving: [
        { deliveryId: "d2", routeCode: 9 },
        { deliveryId: "d3", routeCode: 9 },
      ],
      alreadyHere: ["d5"],
      blocked: [{ deliveryId: "d4", routeCode: 5 }],
      operation: "move",
    });
    expect(movingSummary(plan.moving)).toBe(
      "2 já estão na Rota 9 e serão movidas.",
    );
  });

  it("adds without moving when nothing is on another route", () => {
    expect(planSelection(["d1"], [], null).operation).toBe("add");
    expect(movingSummary([])).toBeNull();
  });

  it("blocks a selection with a delivery that left Pendente", () => {
    expect(addToRouteBlocker([{ status: "PENDING" }])).toBeNull();
    expect(
      addToRouteBlocker([{ status: "PENDING" }, { status: "IN_TRANSIT" }]),
    ).toMatch(/Só entregas pendentes/);
  });
});

describe("a routeEvent on the route page (§5.7)", () => {
  const context = {
    routeId: "r1",
    knownPlanVersion: 3,
    holdingLocalChanges: false,
  };

  it("ignores another route and our own echo, refetches the rest", () => {
    expect(
      routeEventDecision({ type: "route.released", routeId: "r2" }, context),
    ).toBe("ignore");
    expect(
      routeEventDecision(
        { type: "route.stops_changed", routeId: "r1", planVersion: 3 },
        context,
      ),
    ).toBe("ignore");
    expect(
      routeEventDecision(
        { type: "route.stops_changed", routeId: "r1", planVersion: 4 },
        context,
      ),
    ).toBe("refetch");
    expect(
      routeEventDecision(
        { type: "route-stop.settled", routeId: "r1" },
        context,
      ),
    ).toBe("refetch");
    expect(routeEventDecision(null, context)).toBe("ignore");
  });

  it("holds a colleague's plan change while an order is unsaved", () => {
    expect(
      routeEventDecision(
        { type: "route.stops_changed", routeId: "r1", planVersion: 4 },
        { ...context, holdingLocalChanges: true },
      ),
    ).toBe("hold");
  });
});

describe("the picker of deliveries without a route (§5.5)", () => {
  it("defaults to the route's day or no day, and sends what was chosen", () => {
    expect(
      pickerQuery(
        {
          ...DEFAULT_PICKER_FILTERS,
          search: " NF 10 ",
          cities: ["Santos"],
          kinds: ["PICKUP"],
        },
        "2026-10-06T00:00:00.000Z",
        2,
      ),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: "NF 10",
      cities: ["Santos"],
      kinds: ["PICKUP"],
      scheduledFrom: "2026-10-06",
      scheduledTo: "2026-10-06",
      includeUnscheduled: true,
    });

    expect(
      pickerQuery(
        { ...DEFAULT_PICKER_FILTERS, dateMode: "any" },
        "2026-10-06T00:00:00.000Z",
        1,
      ),
    ).toEqual({ page: 1, pageSize: 50 });
  });

  it("sends a long selection in the API's batches of 100, in order", () => {
    const ids = Array.from({ length: 230 }, (_, index) => `d${index}`);
    const batches = chunk(ids);

    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 30]);
    expect(batches.flat()).toEqual(ids);
    expect(toggleValue(["SP"], "RJ")).toEqual(["SP", "RJ"]);
    expect(toggleValue(["SP", "RJ"], "SP")).toEqual(["RJ"]);
  });

  it("treats a stale plan as a reload, not an error", () => {
    expect(isPlanConflict("ROUTE_PLAN_STALE")).toBe(true);
    expect(isPlanConflict("ROUTE_REORDER_MISMATCH")).toBe(true);
    expect(isPlanConflict("DELIVERY_ALREADY_ON_ROUTE")).toBe(false);
    expect(isPlanConflict(undefined)).toBe(false);
  });
});

describe("the page's own plan writes (review r1)", () => {
  const event = (planVersion: number) => ({
    type: "route.stops_changed",
    routeId: "r1",
    routeCode: 12,
    planVersion,
  });

  function harness() {
    const decisions: string[] = [];

    const writes = createOwnPlanWrites((incoming, ownVersions) =>
      decisions.push(
        routeEventDecision(incoming, {
          routeId: "r1",
          // The read still says 4: the page refetches only after its write.
          knownPlanVersion: 4,
          holdingLocalChanges: true,
          ownVersions,
        }),
      ),
    );

    return { decisions, writes };
  }

  it("does not read its own echo, sent before the answer, as somebody else's change", async () => {
    // Red before: the event (v5) was judged on arrival against the version on
    // screen (4) while an order was unsaved — "hold", the false banner.
    const { decisions, writes } = harness();

    let answer: () => void = () => undefined;

    const pending = writes.track(async (adopt) => {
      await new Promise<void>((resolve) => {
        answer = resolve;
      });

      adopt(5);

      return "ok";
    });

    writes.receive(event(5));

    expect(decisions).toEqual([]);

    answer();

    await expect(pending).resolves.toBe("ok");
    expect(decisions).toEqual(["ignore"]);
  });

  it("still holds a colleague's change that arrived during its own write", async () => {
    const { decisions, writes } = harness();

    await writes.track(async (adopt) => {
      writes.receive(event(5));
      writes.receive(event(6));
      adopt(6);
    });

    // v6 was ours; v5 was a colleague's, landed just before.
    expect(decisions).toEqual(["hold", "ignore"]);
  });

  it("replays what waited even when the write failed", async () => {
    const { decisions, writes } = harness();

    await expect(
      writes.track(async () => {
        writes.receive(event(5));
        throw new Error("rede");
      }),
    ).rejects.toThrow("rede");

    expect(decisions).toEqual(["hold"]);
  });

  it("judges an event at once when nothing of its own is in flight", () => {
    const { decisions, writes } = harness();

    writes.receive(event(5));

    expect(decisions).toEqual(["hold"]);
  });
});

describe("which link clicks leave the route page (review r1)", () => {
  const here = {
    origin: "https://app.trajetto.com.br",
    pathname: "/dashboard/routes/r1",
    search: "?businessId=b",
  };
  const plain = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };
  const link = (
    href: string,
    extra: Partial<{ target: string; download: boolean }> = {},
  ) => ({
    href,
    target: "",
    download: false,
    ...extra,
  });

  it("guards a plain click to another page of the app", () => {
    expect(
      leavesPage(plain, link("/dashboard/routes?businessId=b"), here),
    ).toBe(true);
  });

  it("lets new tabs, downloads, other sites and hash jumps through", () => {
    expect(
      leavesPage({ ...plain, ctrlKey: true }, link("/dashboard"), here),
    ).toBe(false);
    expect(leavesPage({ ...plain, button: 1 }, link("/dashboard"), here)).toBe(
      false,
    );
    expect(
      leavesPage(plain, link("/dashboard", { target: "_blank" }), here),
    ).toBe(false);
    expect(
      leavesPage(plain, link("/export.csv", { download: true }), here),
    ).toBe(false);
    expect(
      leavesPage(plain, link("https://openstreetmap.org/copyright"), here),
    ).toBe(false);
    expect(
      leavesPage(plain, link("/dashboard/routes/r1?businessId=b#mapa"), here),
    ).toBe(false);
  });
});

describe("the picker's shipper and date range (review r1)", () => {
  const ROUTE_DAY = "2026-10-06T00:00:00.000Z";

  it("sends the chosen shippers by id", () => {
    expect(
      pickerQuery(
        { ...DEFAULT_PICKER_FILTERS, shippers: ["sh-1", "sh-2"] },
        ROUTE_DAY,
        1,
      ),
    ).toMatchObject({ shipperIds: ["sh-1", "sh-2"] });
  });

  it("sends a picked range, swapped ends put right, with or without the undated", () => {
    const range = { ...DEFAULT_PICKER_FILTERS, dateMode: "range" as const };

    expect(
      pickerQuery(
        { ...range, rangeFrom: "2026-10-09", rangeTo: "2026-10-07" },
        ROUTE_DAY,
        1,
      ),
    ).toMatchObject({
      scheduledFrom: "2026-10-07",
      scheduledTo: "2026-10-09",
      includeUnscheduled: false,
    });

    expect(
      pickerQuery(
        { ...range, rangeFrom: "2026-10-07", rangeIncludesUnscheduled: true },
        ROUTE_DAY,
        1,
      ),
    ).toEqual({
      page: 1,
      pageSize: 50,
      scheduledFrom: "2026-10-07",
      includeUnscheduled: true,
    });

    // No bound yet: every day, nothing half-typed reaches the API.
    expect(
      pickerQuery({ ...range, rangeFrom: "2026-10" }, ROUTE_DAY, 1),
    ).toEqual({
      page: 1,
      pageSize: 50,
    });
  });
});
