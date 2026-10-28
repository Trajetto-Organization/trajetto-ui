import * as React from "react";
import { act, createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import L from "leaflet";

/**
 * The route's own page, live (use-route-detail, route-map).
 *
 * Three defects of the page a dispatcher keeps open while a truck works:
 * the driver's socket point was forced to `fresh: true`, nothing aged it and
 * it stayed after the route ended — a phone silent for an hour still drew a
 * moving truck, and a finished route kept a live dot; every ping re-ran the
 * stops effect, clearing and recreating up to 200 pins and lines; and the
 * route's trail was read once and never again.
 */
const fake = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void;

  const handlers = new Map<string, Set<Listener>>();

  const socket = {
    connected: true,
    on(event: string, listener: Listener) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(listener);
      return socket;
    },
    off(event: string, listener?: Listener) {
      if (listener) handlers.get(event)?.delete(listener);
      else handlers.delete(event);
      return socket;
    },
    emit: () => socket,
    io: { on: () => undefined, off: () => undefined },
    fire(event: string, payload: unknown) {
      for (const listener of handlers.get(event) ?? []) listener(payload);
    },
  };

  return { socket, handlers };
});

vi.mock("@/socket", () => ({
  initializeSocket: async () => fake.socket,
  getSocket: () => fake.socket,
  onRealtimeResync: () => () => undefined,
}));

const api = vi.hoisted(() => ({
  status: "IN_PROGRESS",
  routeReads: 0,
  trailReads: 0,
}));

const ROUTE_ID = "r1";
const DRIVER_ID = "d1";

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

function routeDetail(status = api.status) {
  return {
    route: {
      id: ROUTE_ID,
      code: 12,
      name: null,
      status,
      scheduled_date: "2026-10-28T00:00:00.000Z",
      destination: null,
      planned_departure_at: null,
      planned_arrival_at: null,
      started_at: null,
      completed_at: null,
      cancellation_reason: null,
      driverId: DRIVER_ID,
      vehicleId: null,
      driver: { id: DRIVER_ID, name: "Ana" },
      vehicle: null,
      stops: [],
      plan_version: 1,
      created_at: "2026-10-28T10:00:00.000Z",
      updated_at: "2026-10-28T10:00:00.000Z",
      driverPosition: {
        latitude: -18.9,
        longitude: -48.2,
        speed: null,
        heading: null,
        recordedAt: minutesAgo(2),
        fresh: true,
      },
    },
  };
}

vi.mock("@/actions/route/get-route", () => ({
  getRoute: async () => {
    api.routeReads += 1;

    return { success: true, message: "", data: routeDetail() };
  },
}));

vi.mock("@/actions/route/route-operations", () => ({
  getRouteTrail: async () => {
    api.trailReads += 1;

    return {
      success: true,
      message: "",
      data: { points: [] },
    };
  },
}));

import { useRouteDetail } from "@/features/routes/detail-page/hooks/use-route-detail";
import { routeDriverPosition } from "@/features/routes/lib/live-route-position";
import { routeTrailKey } from "@/features/routes/lib/route-query-keys";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const unmounts: Array<() => Promise<void>> = [];

beforeEach(() => {
  api.status = "IN_PROGRESS";
  api.routeReads = 0;
  api.trailReads = 0;
});

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  fake.handlers.clear();
  vi.useRealTimers();
});

async function until(condition: () => boolean, ms = 2_000): Promise<boolean> {
  const deadline = performance.now() + ms;

  while (performance.now() < deadline) {
    if (condition()) return true;
    await act(async () => {
      await new Promise((done) => setTimeout(done, 20));
    });
  }

  return condition();
}

async function mount(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  await act(async () => {
    await Promise.resolve();
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  return container;
}

const point = (recordedAt: string, latitude = -18.95) => ({
  driverId: DRIVER_ID,
  routeId: ROUTE_ID,
  latitude,
  longitude: -48.25,
  speed: null,
  heading: null,
  recordedAt,
});

describe("routeDriverPosition", () => {
  const fetched = {
    latitude: -18.9,
    longitude: -48.2,
    speed: null,
    heading: null,
    recordedAt: "2026-10-28T12:00:00.000Z",
    fresh: true,
  };
  const at = (iso: string) => Date.parse(iso);

  it("ages a dot by when it was recorded, not by when it arrived", () => {
    const live = { ...fetched, recordedAt: "2026-10-28T12:05:00.000Z" };

    expect(
      routeDriverPosition({
        fetched,
        live,
        routeStatus: "IN_PROGRESS",
        now: at("2026-10-28T12:06:00.000Z"),
      }),
    ).toMatchObject({ recordedAt: live.recordedAt, fresh: true });

    expect(
      routeDriverPosition({
        fetched,
        live,
        routeStatus: "IN_PROGRESS",
        now: at("2026-10-28T12:16:00.000Z"),
      })?.fresh,
    ).toBe(false);
  });

  it("drops the live point once the route left the road", () => {
    const live = {
      ...fetched,
      latitude: -19,
      recordedAt: "2026-10-28T12:05:00.000Z",
    };

    for (const routeStatus of ["COMPLETED", "CANCELLED", "PLANNED"]) {
      expect(
        routeDriverPosition({
          fetched,
          live,
          routeStatus,
          now: at("2026-10-28T12:05:10.000Z"),
        }),
        routeStatus,
      ).toMatchObject({ latitude: -18.9, fresh: false });
    }
  });
});

describe("the driver's dot on the route page", () => {
  function Probe({
    onRender,
  }: {
    onRender: (value: ReturnType<typeof useRouteDetail>) => void;
  }) {
    const holdRef = useRef(false);

    const detail = useRouteDetail({
      businessId: "b1",
      routeId: ROUTE_ID,
      initial: routeDetail() as never,
      admin: false,
      holdRef,
    });

    // The map's trail, as route-map reads it.
    useQuery(routeTrailKey(ROUTE_ID, DRIVER_ID), async () => {
      api.trailReads += 1;
      return [];
    });

    onRender(detail);

    return null;
  }

  async function mountProbe() {
    let latest: ReturnType<typeof useRouteDetail> | null = null;

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await mount(
      createElement(
        QueryClientProvider,
        { client },
        createElement(Probe, {
          onRender: (value) => {
            latest = value;
          },
        }),
      ),
    );

    return () => latest!;
  }

  it("turns grey when the phone stops reporting, without waiting for a read", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });

    const detail = await mountProbe();

    await act(async () => {
      fake.socket.fire("driverPosition", point(new Date().toISOString()));
    });

    expect(
      await until(() => detail().driverPosition?.latitude === -18.95),
    ).toBe(true);
    expect(detail().driverPosition?.fresh).toBe(true);

    // Eleven minutes without a ping: past the Torre's ten-minute window.
    await act(async () => {
      vi.setSystemTime(Date.now() + 11 * 60_000);
      vi.advanceTimersByTime(30_000);
    });

    expect(
      detail().driverPosition?.fresh,
      "o caminhão continuou ao vivo com o telefone calado",
    ).toBe(false);
  });

  it("keeps no live dot after the route completes", async () => {
    const detail = await mountProbe();

    await act(async () => {
      fake.socket.fire(
        "driverPosition",
        point(new Date().toISOString(), -19.1),
      );
    });

    expect(await until(() => detail().driverPosition?.latitude === -19.1)).toBe(
      true,
    );

    // The route completes: the event rereads it.
    api.status = "COMPLETED";

    await act(async () => {
      fake.socket.fire("routeEvent", {
        type: "route.completed",
        routeId: ROUTE_ID,
      });
    });

    expect(await until(() => detail().data.route.status === "COMPLETED")).toBe(
      true,
    );

    expect(detail().driverPosition).toMatchObject({
      latitude: -18.9,
      fresh: false,
    });

    // A later ping (the driver's next route) does not land on this map.
    await act(async () => {
      fake.socket.fire(
        "driverPosition",
        point(new Date().toISOString(), -19.5),
      );
    });

    expect(detail().driverPosition?.latitude).toBe(-18.9);
  });

  it("rereads the route's trail on a route event", async () => {
    await mountProbe();

    expect(await until(() => api.trailReads === 1)).toBe(true);

    await act(async () => {
      fake.socket.fire("routeEvent", {
        type: "route-stop.settled",
        routeId: ROUTE_ID,
      });
    });

    expect(
      await until(() => api.trailReads === 2),
      "o trajeto da rota ficou como estava quando a página abriu",
    ).toBe(true);
  });
});

describe("the route map on a ping", () => {
  const size = { width: 800, height: 480 };

  let widthSpy: { mockRestore: () => void };
  let heightSpy: { mockRestore: () => void };

  beforeAll(() => {
    widthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockImplementation(() => size.width);
    heightSpy = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockImplementation(() => size.height);
  });

  afterAll(() => {
    widthSpy.mockRestore();
    heightSpy.mockRestore();
  });

  it("moves the truck without recreating the stops' pins and lines", async () => {
    const { RouteMap } =
      await import("@/features/routes/detail-page/route-map");

    const polyline = vi.spyOn(L, "polyline");

    const stops = [1, 2, 3].map((index) => ({
      id: `s${index}`,
      sequence: index * 10,
      status: "PENDING",
      arrived_at: null,
      completed_at: null,
      routeId: ROUTE_ID,
      deliveryId: `e${index}`,
      delivery: {
        id: `e${index}`,
        recipient_name: `Cliente ${index}`,
        latitude: -18.9 - index / 100,
        longitude: -48.2,
      },
    }));

    const position = (latitude: number) => ({
      latitude,
      longitude: -48.2,
      speed: null,
      heading: null,
      recordedAt: new Date().toISOString(),
      fresh: true,
    });

    // What the page holds across renders: the order and the setter.
    const orderedIds = stops.map((stop) => stop.id);
    const visitedPoints: never[] = [];
    const onHighlight = () => undefined;

    const props = (latitude: number) => ({
      tiles: null,
      stops: stops as never,
      orderedIds,
      driverPosition: position(latitude),
      driverLabel: "Ana",
      visitedPoints,
      businessId: "b1",
      routeId: ROUTE_ID,
      driverId: DRIVER_ID,
      showTrail: false,
      highlightedStopId: null,
      onHighlight,
      pinning: null,
      canPin: false,
      onStartPin: () => undefined,
      onCancelPin: () => undefined,
      onPin: () => undefined,
    });

    const client = new QueryClient();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const draw = (latitude: number) =>
      act(async () => {
        root.render(
          createElement(
            QueryClientProvider,
            { client },
            createElement(RouteMap, props(latitude)),
          ),
        );
      });

    unmounts.push(async () => {
      await act(async () => root.unmount());
      container.remove();
      polyline.mockRestore();
    });

    await draw(-18.95);

    // The plan line between the three stops.
    const drawn = polyline.mock.calls.length;

    expect(drawn).toBeGreaterThan(0);

    for (const latitude of [-18.951, -18.952, -18.953]) await draw(latitude);

    expect(
      polyline.mock.calls.length,
      "cada ping recriou as paradas e as linhas da rota",
    ).toBe(drawn);
  });
});
