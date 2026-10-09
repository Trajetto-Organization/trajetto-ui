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

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));

import { queryClientProps } from "@/lib/query-client-props";
import { useChartArea } from "@/app/(protected)/_components/overview-dashboard/charts/area-chart/hooks";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";
import { seedPublicConfig } from "./helpers/public-config";

/**
 * The overview's 7- and 30-day charts and the Atualizar next to them (REV-18).
 *
 * The daily series were fetched into component state when the period chip
 * was picked, and nothing asked again: the button re-rendered the monthly
 * data from the server and left "Últimos 7 dias" as it was when first drawn.
 */
let vehiclesToday = 3;
const requests: string[] = [];

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
  seedPublicConfig({ apiUrl: "http://api.test" });
});

beforeEach(() => {
  vehiclesToday = 3;
  requests.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requests.push(String(input));

      return {
        ok: true,
        json: async () => ({
          activityTrends: [{ date: "2026-09-28", vehicles: vehiclesToday }],
          maintenanceCosts: [],
        }),
      };
    }),
  );
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

let chart: ReturnType<typeof useChartArea>;
let screen: ReturnType<typeof useRevalidateScreen>;

async function mountOverview(): Promise<void> {
  const Overview = () => {
    chart = useChartArea({ activityTrends: [] } as never);
    screen = useRevalidateScreen();
    return null;
  };

  const root = createRoot(document.createElement("div"));

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClientProps },
        createElement(Overview),
      ),
    );
  });

  unmounts.push(async () => act(async () => root.unmount()));
}

const today = () =>
  (chart.displayData as Array<{ vehicles?: number }>).at(-1)?.vehicles;

describe("the 7-day chart", () => {
  it("is asked for when the period is picked", async () => {
    await mountOverview();

    await act(async () => chart.handleTimeRangeChange("7d"));

    expect(await until(() => today() === 3)).toBe(true);
    expect(requests.at(-1)).toContain("/dashboard/trends?period=7d");
  });

  it("follows Atualizar", async () => {
    await mountOverview();

    await act(async () => chart.handleTimeRangeChange("7d"));
    expect(await until(() => today() === 3)).toBe(true);

    // Two vehicles registered in another session.
    vehiclesToday = 5;

    await act(async () => {
      await screen.revalidate();
    });

    expect(
      await until(() => today() === 5),
      "o gráfico de 7 dias ficou com o número antigo",
    ).toBe(true);
  });
});
