import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard",
}));

// Classic JSX runtime under vitest: the palette's icons need React in scope.
import "./helpers/render-html";

import { useCommandBarActions } from "@/app/(protected)/_components/layout/protected-command-bar-provider/hooks";
import { visibleSidebarItems } from "@/app/(protected)/_components/layout/protected-sidebar-menu";
import {
  ACCOUNT_ENTRIES,
  NAVIGATION,
} from "@/app/(protected)/_components/layout/protected-navbar-items";

import type { PermissionKey } from "@/lib/permissions";

/**
 * The sidebar and ⌘K say the same thing (NAV-DRIFT-1, decision 4.2).
 *
 * They were two hand-written lists: an employee with Entregas found Torre de
 * Controle and Integrações in ⌘K and not in the sidebar, ⌘K offered
 * "Atividades recentes" that the edge then bounced, and the driver had no
 * sidebar at all (decision 4.8). Both now derive from one list; this proves
 * they agree for every role in the contract's matrix.
 */
type Role = "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER";

interface Session {
  role: Role;
  permissions?: PermissionKey[];
  driverId?: string | null;
  enabledModules: string[];
}

const BOTH = ["FLEET", "DELIVERIES"];

const SESSIONS: Record<string, Session> = {
  master: { role: "MASTER", enabledModules: [] },
  admin: { role: "BUSINESS_ADMIN", enabledModules: BOTH },
  "admin without deliveries": {
    role: "BUSINESS_ADMIN",
    enabledModules: ["FLEET"],
  },
  "full employee": {
    role: "BUSINESS_USER",
    permissions: ["delivery_manage", "occurrence_manage", "integration_manage"],
    enabledModules: BOTH,
  },
  "read-only employee": {
    role: "BUSINESS_USER",
    permissions: ["delivery_manage"],
    enabledModules: BOTH,
  },
  driver: { role: "BUSINESS_USER", driverId: "driver-1", enabledModules: BOTH },
  "driver without fleet": {
    role: "BUSINESS_USER",
    driverId: "driver-1",
    enabledModules: ["DELIVERIES"],
  },
};

function sidebarPaths(session: Session): string[] {
  return visibleSidebarItems(
    {
      role: session.role,
      permissions: session.permissions,
      driverId: session.driverId,
      enabledModules: session.enabledModules,
    },
    session.enabledModules,
  )
    .flatMap((item) => (item.items?.length ? item.items : [item]))
    .map((item) => item.url)
    .sort();
}

function palettePaths(session: Session): string[] {
  const { actions } = useCommandBarActions({
    user: {
      role: session.role,
      driverId: session.driverId,
      permissions: (session.permissions ?? []).map((permissionKey) => ({
        permissionKey,
        canRead: true,
      })),
    },
    enabledModules: session.enabledModules,
  });

  return actions.map((action) => action.path as string).sort();
}

/** Pages that are palette-only on purpose (a card opens them; the account menu). */
const PALETTE_ONLY = new Set(
  [
    ...Object.values(NAVIGATION).flatMap((nodes) =>
      nodes.flatMap((node) => ("items" in node ? node.items : [node])),
    ),
    ...ACCOUNT_ENTRIES,
  ]
    .filter((entry) => entry.sidebar === false)
    .map((entry) => entry.path),
);

describe("the sidebar and the palette agree", () => {
  it.each(Object.keys(SESSIONS))("for the %s", (name) => {
    const session = SESSIONS[name];

    expect(sidebarPaths(session)).toEqual(
      palettePaths(session).filter((path) => !PALETTE_ONLY.has(path)),
    );
  });
});

describe("what each role finds", () => {
  it("gives the employee with Entregas the tower and integrations in the sidebar", () => {
    const paths = sidebarPaths(SESSIONS["full employee"]);

    expect(paths).toContain("/dashboard/control-tower");
    expect(paths).toContain("/dashboard/integrations");
  });

  it("never offers an employee the company activity feed", () => {
    expect(palettePaths(SESSIONS["full employee"])).not.toContain(
      "/dashboard/activity",
    );
    expect(palettePaths(SESSIONS.admin)).toContain("/dashboard/activity");
  });

  it("keeps integrations away from a company without Entregas", () => {
    expect(palettePaths(SESSIONS["admin without deliveries"])).not.toContain(
      "/dashboard/integrations",
    );
    expect(sidebarPaths(SESSIONS["admin without deliveries"])).not.toContain(
      "/dashboard/integrations",
    );
  });

  it("gives the driver a sidebar of the driver's own pages", () => {
    expect(sidebarPaths(SESSIONS.driver)).toEqual([
      "/driver/account-payable",
      "/driver/kanban",
      "/driver/vehicles",
    ]);
  });

  it("takes Contas a pagar out of the driver's menus without FLEET", () => {
    expect(sidebarPaths(SESSIONS["driver without fleet"])).toEqual([
      "/driver/kanban",
      "/driver/vehicles",
    ]);
    expect(palettePaths(SESSIONS["driver without fleet"])).not.toContain(
      "/driver/account-payable",
    );
  });

  it("offers the read-only employee what the profile reads, write or not", () => {
    // Somente leitura vê a tela; what it cannot write is the page's concern.
    const paths = sidebarPaths(SESSIONS["read-only employee"]);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/dashboard/deliveries",
        "/dashboard/routes",
        "/dashboard/control-tower",
      ]),
    );
    expect(paths).not.toContain("/dashboard/integrations");
  });

  it("shows the MASTER every back-office page, whatever a company hired", () => {
    const paths = sidebarPaths(SESSIONS.master);

    expect(paths).toEqual(
      expect.arrayContaining([
        "/admin/deliveries",
        "/admin/fuel",
        "/admin/integrations",
      ]),
    );
  });
});
