import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

/**
 * The monitoring tab by route (decision 6.6) and by driver (DLV-MON-3).
 *
 * By route: each route of the day with its completion and one dot per
 * delivery — green delivered, red not delivered, grey pending — repainted by
 * the socket when a stop settles. By driver: the progress used to be
 * delivered / (designated + in route + delivered), so the refused addresses
 * left both sides of the fraction.
 */
const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const place = vi.hoisted(() => ({
  pathname: "/dashboard/deliveries",
  search: "tab=monitoring",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => place.pathname,
  useSearchParams: () => new URLSearchParams(place.search),
}));

const socket = vi.hoisted(() => {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();

  return {
    connected: true,
    on(event: string, handler: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    off(event: string, handler: (payload: unknown) => void) {
      handlers.get(event)?.delete(handler);
    },
    emit: () => undefined,
    fire(event: string, payload: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
    reset() {
      handlers.clear();
    },
  };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => socket,
  getSocket: () => socket,
  onRealtimeResync: () => () => undefined,
}));

const api = vi.hoisted(() => ({
  calls: 0,
  routeCompanies: [] as Array<string | undefined>,
  driverCompanies: [] as Array<string | undefined>,
  routePages: [] as number[],

  /** A board of its own for a case; null answers the one-route day below. */
  board: null as null | ((page: number) => unknown),
}));

const stop = (id: string, sequence: number, status: string) => ({
  id,
  sequence,
  status,
  deliveryId: `delivery-${id}`,
  recipientName: `Cliente ${id}`,
  city: "Uberlândia",
  onTheWayAt: null,
  arrivedAt: null,
  completedAt:
    status === "COMPLETED" || status === "FAILED"
      ? "2026-09-28T15:00:00.000Z"
      : null,
});

vi.mock("@/actions/control-tower", () => ({
  getDriverMonitoring: async (options: { businessId?: string } = {}) => {
    api.driverCompanies.push(options.businessId);

    return {
      success: true,
      message: "",
      data: {
        day: "2026-09-28",
        timeZone: "America/Sao_Paulo",
        drivers: [
          {
            driverId: "d1",
            driverName: "Ana",
            cnh: "123",
            // Today's route only: the summary's 5 counted tomorrow's too.
            designated: 2,
            inRoute: 0,
            deliveredToday: 3,
            failedToday: 2,
          },
        ],
      },
    };
  },
  getRouteMonitoring: async (
    options: { businessId?: string; page?: number } = {},
  ) => {
    api.calls += 1;
    api.routeCompanies.push(options.businessId);
    api.routePages.push(options.page ?? 1);

    if (api.board)
      return { success: true, message: "", data: api.board(options.page ?? 1) };

    return {
      success: true,
      message: "",
      data: {
        day: "2026-09-28",
        meta: { total: 1, page: 1, pageSize: 20 },
        routes: [
          {
            id: "r1",
            code: 12,
            name: "Centro",
            destination: "Uberlândia",
            status: "IN_PROGRESS",
            scheduledDate: "2026-09-28",
            plannedDepartureAt: null,
            startedAt: "2026-09-28T11:00:00.000Z",
            completedAt: null,
            driver: { id: "d1", name: "Ana" },
            vehiclePlate: "ABC1D23",
            progress: {
              total: 4,
              delivered: 1,
              failed: 1,
              pending: 2,
              cancelled: 0,
              arrived: 0,
              onTheWay: 0,
              completion: 50,
              deliveredRate: 25,
            },
            stops: [
              stop("s1", 1, "COMPLETED"),
              stop("s2", 2, "FAILED"),
              stop("s3", 3, "PENDING"),
              stop("s4", 4, "PENDING"),
            ],
          },
        ],
      },
    };
  },
}));

import { queryClientProps } from "@/lib/query-client-props";
import { MonitoringPanel } from "@/features/deliveries/monitoring";
import { driverProgress } from "@/features/deliveries/monitoring/lib/progress";
import { settledBoardPage } from "@/features/deliveries/monitoring/lib/board-page";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.calls = 0;
  api.routeCompanies = [];
  api.driverCompanies = [];
  api.routePages = [];
  api.board = null;
  place.pathname = "/dashboard/deliveries";
  place.search = "tab=monitoring";
  socket.reset();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
});

async function until(condition: () => boolean, ms = 3_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function renderPanel() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(MonitoringPanel),
      ),
    );
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  return container;
}

const dots = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-dot]")].map((dot) =>
    dot.getAttribute("data-dot"),
  );

describe("the tab strip and the company", () => {
  it("is the product's scrollable tab strip (decision 3.1)", async () => {
    const container = await renderPanel();

    const tablist = container.querySelector("[role='tablist']");

    expect(tablist).toBeTruthy();
    expect(tablist?.closest("[data-scroll-rail]")).toBeTruthy();
  });

  it("never asks for another company from /dashboard, whatever the address says", async () => {
    place.search =
      "tab=monitoring&businessId=018f0000-0000-7000-8000-00000000000b";

    const container = await renderPanel();

    expect(await until(() => api.routeCompanies.length > 0)).toBe(true);
    expect(api.routeCompanies).toEqual([undefined]);

    expect(await openDriverBoard(container)).toBe(true);
    expect(await until(() => api.driverCompanies.length > 0)).toBe(true);
    expect(api.driverCompanies).toEqual([undefined]);
  });

  it("reads the company the MASTER picked on /admin", async () => {
    place.pathname = "/admin/deliveries";
    place.search =
      "tab=monitoring&businessId=018f0000-0000-7000-8000-00000000000b";

    await renderPanel();

    expect(await until(() => api.routeCompanies.length > 0)).toBe(true);
    expect(api.routeCompanies).toEqual([
      "018f0000-0000-7000-8000-00000000000b",
    ]);
  });
});

describe("the board by route", () => {
  it("draws one dot per delivery, in the route's order, with the completion", async () => {
    const container = await renderPanel();

    expect(await until(() => dots(container).length === 4)).toBe(true);

    expect(dots(container)).toEqual([
      "delivered",
      "failed",
      "pending",
      "pending",
    ]);
    expect(container.textContent).toContain("Rota 12");
    expect(container.textContent).toContain("2 de 4");
    expect(container.textContent).toContain("50%");

    // Each dot names the delivery and how it ended.
    expect(
      container.querySelector("[data-dot='failed']")?.getAttribute("title"),
    ).toContain("Cliente s2");
  });

  it("repaints a dot from the socket without asking the API", async () => {
    const container = await renderPanel();

    expect(await until(() => dots(container).length === 4)).toBe(true);

    const calls = api.calls;

    await act(async () => {
      socket.fire("routeEvent", {
        type: "route-stop.settled",
        routeId: "r1",
        stopId: "s3",
        stopStatus: "FAILED",
        deliveryId: "delivery-s3",
      });
    });

    expect(await until(() => dots(container)[2] === "failed")).toBe(true);
    expect(container.textContent).toContain("3 de 4");
    expect(container.textContent).toContain("75%");
    expect(api.calls).toBe(calls);
  });
});

describe("a page the list moved under (DLVP-MON-1)", () => {
  const route = (id: string, code: number) => ({
    id,
    code,
    name: null,
    destination: null,
    status: "RELEASED",
    scheduledDate: "2026-09-28",
    plannedDepartureAt: null,
    startedAt: null,
    completedAt: null,
    driver: { id: "d1", name: "Ana" },
    vehiclePlate: null,
    progress: {
      total: 1,
      delivered: 0,
      failed: 0,
      pending: 1,
      cancelled: 0,
      arrived: 0,
      onTheWay: 0,
      completion: 0,
      deliveredRate: 0,
    },
    stops: [stop(`${id}-1`, 1, "PENDING")],
  });

  it("goes back to the last page instead of saying there is no route today", async () => {
    // One route a page, two routes: the dispatcher is on page 2.
    let routes = [route("r1", 101), route("r2", 102)];

    api.board = (page) => ({
      day: "2026-09-28",
      timeZone: "America/Sao_Paulo",
      meta: { total: routes.length, page, pageSize: 1 },
      routes: routes.slice(page - 1, page),
    });

    const container = await renderPanel();

    expect(
      await until(() => (container.textContent ?? "").includes("Rota 101")),
    ).toBe(true);

    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "Próxima")!
        .click();
    });

    expect(
      await until(() => (container.textContent ?? "").includes("Rota 102")),
    ).toBe(true);

    // Route 102 is cancelled; the event rereads page 2, now past the end.
    routes = [route("r1", 101)];

    await act(async () => {
      socket.fire("routeEvent", { type: "route.cancelled", routeId: "r2" });
    });

    expect(
      await until(
        () => (container.textContent ?? "").includes("Rota 101"),
        6_000,
      ),
    ).toBe(true);

    expect(container.textContent).not.toContain("Nenhuma rota hoje");
    expect(api.routePages).toContain(2);
  });

  it("settles the page only on a read of that page", () => {
    const meta = (page: number, total: number) => ({
      page,
      pageSize: 20,
      total,
    });

    expect(settledBoardPage(2, meta(2, 20))).toBe(1);
    expect(settledBoardPage(3, meta(3, 41))).toBe(3);
    expect(settledBoardPage(5, meta(5, 0))).toBe(1);

    // The previous page still on screen while the next one loads.
    expect(settledBoardPage(2, meta(1, 20))).toBe(2);
    expect(settledBoardPage(2, undefined)).toBe(2);
  });
});

async function openDriverBoard(container: HTMLElement) {
  await act(async () => {
    const trigger = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Por motorista",
    );

    // Radix tabs switch on mousedown, not on click.
    trigger?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 }),
    );
    trigger?.click();
  });

  return until(() =>
    (container.textContent ?? "").includes("Carga do dia por motorista"),
  );
}

describe("the board by driver (DLV-MON-3)", () => {
  it("counts the refused addresses as resolved, over the day's load only", async () => {
    const container = await renderPanel();

    expect(await openDriverBoard(container)).toBe(true);

    // The tower's definition of the day (decision 7.1): 2 designated on
    // today's route, not the summary's 5 of any date. 3 delivered + 2
    // refused of 7: the old bar said 3 / (5 + 3) = 38%.
    expect(
      await until(() => (container.textContent ?? "").includes("5 de 7 · 71%")),
    ).toBe(true);
    expect(container.textContent).toContain("2 designadas");
    expect(container.textContent).not.toContain("5 designadas");
  });

  it("rereads the day when a route event arrives", async () => {
    const container = await renderPanel();

    expect(await openDriverBoard(container)).toBe(true);
    expect(await until(() => api.driverCompanies.length === 1)).toBe(true);

    await act(async () => {
      socket.fire("routeEvent", { type: "route.started", routeId: "r1" });
    });

    expect(await until(() => api.driverCompanies.length === 2)).toBe(true);
  });

  it("keeps the delivered share apart from the completion", () => {
    expect(
      driverProgress({
        designated: 0,
        inRoute: 0,
        deliveredToday: 3,
        failedToday: 7,
      }),
    ).toEqual({ resolved: 10, total: 10, completion: 100, deliveredRate: 30 });
  });
});
