import { describe, expect, it } from "vitest";

import {
  ROUTE_STATUS_META,
  ROUTE_STOP_STATUS_META,
  canCancelRoute,
  canReleaseRoute,
  canUnreleaseRoute,
  isRouteEditable,
  moveStop,
  routeProgress,
} from "@/features/routes/lib/status";

import { buildStatsData } from "@/features/routes/lib/stats-config";
import { canAccessPath } from "@/lib/route-access";

/**
 * The decisions the route screens make on their own.
 *
 * Everything here mirrors a rule the API enforces, and the API stays the
 * enforcement point — what these decide is what the dispatcher is OFFERED. A
 * mistake in any of them is silent: the screen still renders, the typecheck
 * still passes, and the operator either sees an action that will be refused or
 * does not see one they are entitled to.
 */
describe("what the board offers on a route", () => {
  it("lets a route be edited only before it leaves", () => {
    // After the departure the route is a record of what the driver is doing,
    // and the order is what they are following on the screen in their hand.
    expect(isRouteEditable("PLANNED")).toBe(true);
    expect(isRouteEditable("RELEASED")).toBe(true);

    expect(isRouteEditable("IN_PROGRESS")).toBe(false);
    expect(isRouteEditable("COMPLETED")).toBe(false);
    expect(isRouteEditable("CANCELLED")).toBe(false);
  });

  it("offers the handover only from planning", () => {
    expect(canReleaseRoute("PLANNED")).toBe(true);

    for (const status of ["RELEASED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const) {
      expect(canReleaseRoute(status), status).toBe(false);
    }
  });

  it("offers the way back only from a released route", () => {
    expect(canUnreleaseRoute("RELEASED")).toBe(true);

    // A route that already left cannot be un-released — it can only be
    // cancelled, which is a different act with a different cost.
    expect(canUnreleaseRoute("IN_PROGRESS")).toBe(false);
    expect(canUnreleaseRoute("PLANNED")).toBe(false);
  });

  it("offers cancellation right up to the end, and not after", () => {
    // A truck that breaks down after leaving has to be callable off.
    expect(canCancelRoute("PLANNED")).toBe(true);
    expect(canCancelRoute("RELEASED")).toBe(true);
    expect(canCancelRoute("IN_PROGRESS")).toBe(true);

    expect(canCancelRoute("COMPLETED")).toBe(false);
    expect(canCancelRoute("CANCELLED")).toBe(false);
  });

  it("has a Portuguese label and a colour for every state", () => {
    // A status with no entry renders as a crash, not as a blank.
    for (const status of ["PLANNED", "RELEASED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const) {
      expect(ROUTE_STATUS_META[status].label.length, status).toBeGreaterThan(0);
      expect(ROUTE_STATUS_META[status].badgeClassName, status).toContain("bg-");
    }

    for (const status of ["PENDING", "ARRIVED", "COMPLETED", "FAILED", "CANCELLED"] as const) {
      expect(ROUTE_STOP_STATUS_META[status].label.length, status).toBeGreaterThan(0);
    }
  });
});

describe("how much of a route is done", () => {
  it("counts every resolved stop, whatever the outcome", () => {
    // An insucesso is a result, not an interruption: the driver is not going
    // back to that address today, so it is done.
    expect(routeProgress(["COMPLETED", "FAILED", "PENDING"])).toEqual({
      done: 2,
      total: 3,
    });
  });

  it("leaves cancelled stops out of both halves", () => {
    // A stop called off was never work: counting it as pending would show a
    // finished route as unfinished forever.
    expect(routeProgress(["COMPLETED", "CANCELLED"])).toEqual({
      done: 1,
      total: 1,
    });
  });

  it("treats an arrival as still open", () => {
    // The driver is standing there. Nothing has been resolved yet.
    expect(routeProgress(["ARRIVED"])).toEqual({ done: 0, total: 1 });
  });

  it("answers zero for a route with no stops", () => {
    expect(routeProgress([])).toEqual({ done: 0, total: 0 });
  });
});

describe("moving a stop in the order", () => {
  const list = ["a", "b", "c"];

  it("swaps with the neighbour above", () => {
    expect(moveStop(list, 1, -1)).toEqual(["b", "a", "c"]);
  });

  it("swaps with the neighbour below", () => {
    expect(moveStop(list, 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("refuses to move the first one up or the last one down", () => {
    expect(moveStop(list, 0, -1)).toBeNull();
    expect(moveStop(list, 2, 1)).toBeNull();
  });

  it("never mutates the list it was given", () => {
    // The dialog holds this array in state; mutating it in place would move
    // the row on screen without React ever hearing about it.
    const original = [...list];

    moveStop(list, 1, -1);

    expect(list).toEqual(original);
  });
});

describe("the cards above the board", () => {
  it("reads the tally out of searchMeta, where the stream actually puts it", () => {
    // sendAsNDJSON nests whatever the use case returned in `meta` under
    // `searchMeta`. Reading the top level instead yields four zeros over a
    // full operation — and nothing about the screen would look broken.
    const data = buildStatsData(12, {
      statusCounts: {
        PLANNED: 3,
        RELEASED: 2,
        IN_PROGRESS: 4,
        COMPLETED: 2,
        CANCELLED: 1,
      },
    });

    expect(data.totalRoutes).toBe(12);
    expect(data.inProgress).toBe(4);
    expect(data.completed).toBe(2);
  });

  it("folds released into “aguardando liberação”, because neither has left", () => {
    const data = buildStatsData(5, {
      statusCounts: { PLANNED: 3, RELEASED: 2 },
    });

    expect(data.planned).toBe(5);
  });

  it("reads zero rather than undefined for a status with no routes", () => {
    // A company with nothing cancelled must not render "undefined" on a card.
    const data = buildStatsData(0, { statusCounts: {} });

    expect(data).toEqual({
      totalRoutes: 0,
      planned: 0,
      inProgress: 0,
      completed: 0,
    });
  });

  it("survives a response that carried no aggregate at all", () => {
    expect(buildStatsData(7, undefined).totalRoutes).toBe(7);
    expect(buildStatsData(7, undefined).inProgress).toBe(0);
  });
});

describe("who can reach the route screens", () => {
  it("lets a business admin of a company with the module in", () => {
    expect(
      canAccessPath("/dashboard/routes", {
        role: "BUSINESS_ADMIN",
        permissions: [],
        enabledModules: ["DELIVERIES"],
      }),
    ).toBe(true);
  });

  it("keeps out a user without delivery_manage", () => {
    expect(
      canAccessPath("/dashboard/routes", {
        role: "BUSINESS_USER",
        permissions: ["vehicle_manage"],
        enabledModules: ["DELIVERIES"],
      }),
    ).toBe(false);
  });

  it("keeps out a company that never hired Entregas", () => {
    // The route IS how deliveries are dispatched, so it lives behind the same
    // module — selling one without the other would be selling a screen that
    // the API refuses on every request.
    expect(
      canAccessPath("/dashboard/routes", {
        role: "BUSINESS_ADMIN",
        permissions: ["delivery_manage"],
        enabledModules: ["FLEET"],
      }),
    ).toBe(false);
  });

  it("lets the master through to the admin board", () => {
    expect(
      canAccessPath("/admin/routes", {
        role: "MASTER",
        permissions: [],
        enabledModules: [],
      }),
    ).toBe(true);
  });

  /**
   * The path the registry has never heard of, and the two opposite answers
   * the product needs for it.
   *
   * No test reached this branch at all, and both mutations of it survived the
   * whole suite — which is the shape of a rule that exists only in a comment.
   *
   * The two callers want opposite things, and both are right:
   *
   * - the sidebar and the ⌘K hand over entries that are HAND-WRITTEN. One of
   *   them outrunning the registry is ordinary, and hiding it would erase a
   *   working link from the menu because somebody forgot a line in a file
   *   nobody reads;
   * - the dashboard's shortcut cards do the opposite, and that is what keeps
   *   "Empresas" off a company's dashboard: there is no `/dashboard/business`
   *   route, so an unknown path there is not a menu that outran anything — it
   *   is a card pointing into the back office.
   */
  it("allows a path the registry does not know, by default", () => {
    expect(
      canAccessPath("/dashboard/uma-tela-que-ainda-nao-esta-no-registro", {
        role: "BUSINESS_USER",
        permissions: [],
        enabledModules: ["DELIVERIES"],
      }),
    ).toBe(true);
  });

  it("and denies the same path when the caller asks it to", () => {
    expect(
      canAccessPath(
        "/dashboard/business",
        {
          role: "BUSINESS_ADMIN",
          permissions: ["delivery_manage"],
          enabledModules: ["DELIVERIES"],
        },
        { unregistered: "deny" },
      ),
    ).toBe(false);
  });

  it("and the deny does not leak onto paths that ARE registered", () => {
    // Otherwise the option would read as "deny everything", and the shortcut
    // cards would empty themselves.
    expect(
      canAccessPath(
        "/dashboard/routes",
        {
          role: "BUSINESS_ADMIN",
          permissions: ["delivery_manage"],
          enabledModules: ["DELIVERIES"],
        },
        { unregistered: "deny" },
      ),
    ).toBe(true);
  });

  it("stays open while the modules are still unknown", () => {
    // `null` means "not confirmed yet". Hiding a menu on an unconfirmed value
    // is how the sidebar used to erase itself on a slow session load.
    expect(
      canAccessPath("/dashboard/routes", {
        role: "BUSINESS_ADMIN",
        permissions: ["delivery_manage"],
        enabledModules: null,
      }),
    ).toBe(true);
  });
});

describe("a driver is only ever on the driver's surface", () => {
  const driver = {
    role: "BUSINESS_USER" as const,
    permissions: [],
    enabledModules: ["DELIVERIES", "FLEET"],
    isDriver: true,
  };

  /**
   * This used to answer TRUE for every one of them.
   *
   * The permission gate is skipped for drivers — they carry no profile access
   * — so a route whose only requirement was a permission waved them straight
   * through. Nothing leaked, because the edge middleware refuses anything
   * outside `/driver`, `/profile` and `/notifications`, and the palette builds
   * a different action list per role. Both of those are layers on top of a
   * rule that said yes.
   */
  it.each([
    "/dashboard/deliveries",
    "/dashboard/routes",
    "/dashboard/control-tower",
    "/dashboard/integrations",
    "/dashboard/vehicle",
    "/admin",

    /*
      The two that look like the driver's surface and are not. `/dashboard/driver`
      is the company's driver REGISTRY — hiring, documents, contracts — and
      `/dashboard/profile-access` is where permissions themselves are handed
      out. A prefix check written with `includes` instead of a segment boundary
      lets a driver into both, and the difference is invisible against any
      path that does not contain the word.
    */
    "/dashboard/driver",
    "/dashboard/profile-access",
  ])("%s is not theirs", (path) => {
    expect(canAccessPath(path, driver)).toBe(false);
  });

  it.each(["/driver/kanban", "/driver/vehicles", "/profile", "/notifications"])(
    "%s is",
    (path) => {
      expect(canAccessPath(path, driver)).toBe(true);
    },
  );

  it("and the module gate still applies inside it", () => {
    // Being on the right surface is not the same as having the plan for it:
    // Contas a pagar is fleet paperwork, and a company without FLEET has none.
    expect(
      canAccessPath("/driver/account-payable", {
        ...driver,
        enabledModules: ["DELIVERIES"],
      }),
    ).toBe(false);
  });

  it("and an office user is unaffected by the rule", () => {
    // The mirror image: the driver check must not catch anybody else, or
    // every employee loses the office to a one-line guard.
    expect(
      canAccessPath("/dashboard/deliveries", {
        role: "BUSINESS_USER",
        permissions: ["delivery_manage"],
        enabledModules: ["DELIVERIES"],
        isDriver: false,
      }),
    ).toBe(true);
  });
});
