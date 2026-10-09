import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
// The tab tutorial watches the DOM through the tutorial provider; the
// shortcut gate under test does not depend on it.
vi.mock(
  "@/app/(protected)/_components/overview-dashboard/hooks/tab-tutorial",
  () => ({ useTabTutorial: () => undefined }),
);

// Puts React in scope for the classic-runtime JSX of the modules below.
import "./helpers/render-html";

import { OverviewDashboard } from "@/app/(protected)/_components/overview-dashboard";
import { useAuthStore } from "@/store/auth-store";

import type {
  DashboardData,
  OverviewDashboardProps,
} from "@/app/(protected)/_components/overview-dashboard/shared/common.types";
import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

/**
 * ROUTE-KEY-1 on the overview: a profile row saved with canRead false is not
 * access. The shortcut cards used to map every row to its key, so "Veículos"
 * showed for a profile that may not read vehicles, and its page then answered
 * 403 on every request.
 */
const COUNT = { value: 3, change: 0 };

const DATA: DashboardData = {
  counts: {
    vehicles: COUNT,
    drivers: COUNT,
    businesses: COUNT,
    branches: COUNT,
    parts: COUNT,
    suppliers: COUNT,
    serviceOrders: COUNT,
    users: COUNT,
    fines: COUNT,
  },
  deliveryOperation: null,
  vehicleStatus: [],
  maintenanceStats: [],
  activityTrends: [],
  recentActivity: [],
  vehiclesByType: [],
  maintenanceCosts: [],
};

const ROWS = [
  {
    permissionKey: "vehicle_manage" as PermissionKey,
    canRead: false,
    canWrite: false,
  },
  {
    permissionKey: "driver_manage" as PermissionKey,
    canRead: true,
    canWrite: false,
  },
];

/**
 * Mounted in the DOM, not server-rendered: on the server zustand answers with
 * its initial state, and the live store is half of what is under test.
 */
async function render(
  props: Partial<OverviewDashboardProps> = {},
): Promise<string> {
  const client = new QueryClient();
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(OverviewDashboard, {
          initialData: DATA,
          basePath: "/dashboard",
          userLogged: {
            role: "BUSINESS_USER",
            name: "Operador",
            email: "operador@example.com",
            profileAccess: { permissions: ROWS },
            enabledModules: ["FLEET", "DELIVERIES"],
          },
          ...props,
        }),
      ),
    );
  });

  const html = container.innerHTML;

  await act(async () => root.unmount());

  return html;
}

function cardTitles(html: string): string[] {
  const grid =
    html.split("data-cards")[1]?.split("Atividades Recentes")[0] ?? "";

  return ["Veículos", "Motoristas"].filter((title) => grid.includes(title));
}

describe("the overview tabs", () => {
  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("name the first tab in Portuguese", async () => {
    const html = await render();

    expect(html).toContain("Visão geral");
    expect(html).not.toContain(">Overview<");
  });
});

describe("the overview shortcut cards", () => {
  beforeAll(() => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    useAuthStore.setState({ permissions: [], enabledModules: null });
  });

  it("skip a permission row that cannot be read (server-rendered profile)", async () => {
    const html = await render();

    expect(cardTitles(html)).toEqual(["Motoristas"]);
    expect(html).not.toContain('href="/dashboard/vehicle"');
    expect(html).toContain('href="/dashboard/driver"');
  });

  it("skip it too once the auth store holds the live permissions", async () => {
    useAuthStore.setState({
      permissions: ROWS,
      enabledModules: ["FLEET", "DELIVERIES"],
    });

    const html = await render({
      userLogged: {
        role: "BUSINESS_USER",
        name: "Operador",
        email: "operador@example.com",
        profileAccess: { permissions: [] },
      },
    });

    expect(cardTitles(html)).toEqual(["Motoristas"]);
    expect(html).not.toContain('href="/dashboard/vehicle"');
    expect(html).toContain('href="/dashboard/driver"');
  });
});
