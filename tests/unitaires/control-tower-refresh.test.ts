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

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/dashboard/control-tower",
  useSearchParams: () => new URLSearchParams(),
}));

// Leaflet needs a real browser; the stub keeps the one thing the test uses,
// picking a driver on the map.
vi.mock("next/dynamic", () => ({
  default: () =>
    function TowerMapStub(props: {
      onSelectDriver: (driverId: string) => void;
    }) {
      return createElement(
        "button",
        { type: "button", onClick: () => props.onSelectDriver("d1") },
        "Selecionar Ana",
      );
    },
}));

vi.mock("@/socket", () => ({
  initializeSocket: () => new Promise(() => undefined),
  getSocket: () => null,
  onRealtimeResync: () => () => undefined,
}));

/** The API as the two server actions answer it. */
const api = vi.hoisted(() => ({ towerCalls: 0, trailCalls: 0 }));

vi.mock("@/actions/control-tower", () => ({
  getControlTower: async () => {
    api.towerCalls += 1;

    return {
      success: true,
      message: "",
      data: {
        positions: [
          {
            driverId: "d1",
            driverName: "Ana",
            routeId: "r1",
            routeCode: 7,
            vehiclePlate: "ABC1D23",
            latitude: -18.9,
            longitude: -48.2,
            speed: null,
            heading: null,
            battery: null,
            recordedAt: new Date().toISOString(),
            fresh: true,
          },
        ],
        funnel: [],
        progress: { finished: 0, total: 0, rate: null },
        punctuality: {
          onTime: 0,
          late: 0,
          notDeparted: 0,
          notPlanned: 0,
          rate: null,
        },
        events: [],
      },
    };
  },
  getDriverTrail: async () => {
    api.trailCalls += 1;

    return {
      success: true,
      message: "",
      data: {
        driverId: "d1",
        day: "2026-09-28",
        recorded: api.trailCalls * 10,
        points: [],
      },
    };
  },
}));

import { queryClientProps } from "@/lib/query-client-props";
import { ControlTowerPanel } from "@/features/control-tower/panel";
import { ControlTowerPageActions } from "@/features/control-tower/page-actions";

/**
 * The tower's "Atualizar" with a driver selected (REV-19, decision 2.1).
 *
 * It refetched the tower and left the selected driver's trail as it was when
 * the driver was clicked — the line on the map stopped where it had been.
 */
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

beforeEach(() => {
  api.towerCalls = 0;
  api.trailCalls = 0;
  localStorage.clear();
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  queryClientProps.clear();
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

describe("Atualizar on the control tower", () => {
  it("brings the selected driver's trail along with the tower", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClientProps },
          createElement(
            "div",
            null,
            // Atualizar lives in the page toolbar now (UI-TWR-3), beside the
            // panel it refreshes.
            createElement(ControlTowerPageActions),
            createElement(ControlTowerPanel, {
              businessId: "018f0000-0000-7000-8000-00000000000b",
            }),
          ),
        ),
      );
    });

    unmounts.push(async () => {
      await act(async () => root.unmount());
      container.remove();
    });

    const button = (name: RegExp) =>
      [...container.querySelectorAll("button")].find((candidate) =>
        name.test(candidate.textContent ?? ""),
      );

    expect(await until(() => Boolean(button(/Selecionar Ana/)))).toBe(true);

    await act(async () => button(/Selecionar Ana/)!.click());
    expect(await until(() => api.trailCalls === 1)).toBe(true);

    const towerBefore = api.towerCalls;

    await act(async () => button(/Atualizar/)!.click());

    expect(await until(() => api.towerCalls > towerBefore)).toBe(true);
    expect(
      await until(() => api.trailCalls === 2),
      "a trilha do motorista ficou como estava",
    ).toBe(true);
  });
});
