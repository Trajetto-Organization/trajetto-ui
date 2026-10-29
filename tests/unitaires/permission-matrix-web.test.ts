import { describe, expect, it } from "vitest";

import {
  canAccessPath,
  findAppRoute,
  isDriverOnlyPath,
  readablePermissionKeys,
  type RouteAccessContext,
} from "@/lib/route-access";

import {
  accessibleDeliveryTabs,
  parseDeliveryTab,
} from "@/features/deliveries/lib/tabs";
import { accessibleTowerViews } from "@/features/control-tower/lib/views";

import { getRouteHierarchy } from "@/app/(protected)/_components/layout/protected-breadcrumbs/hooks";
import { appRoutes } from "@/app/app-routes";

/**
 * The web half of the permission matrix (contract §8, decisions 4.1–4.8):
 * MASTER, BUSINESS_ADMIN, BUSINESS_USER with the full and the read-only
 * profile, the driver, and a company without the module — through the one
 * registry every surface asks (sidebar, ⌘K, the server gate, the realtime
 * gate, the edge's role rule and the tabs of Entregas).
 */
const BOTH = ["FLEET", "DELIVERIES"];

const MASTER: RouteAccessContext = { role: "MASTER", enabledModules: [] };

const ADMIN: RouteAccessContext = {
  role: "BUSINESS_ADMIN",
  permissions: [],
  enabledModules: BOTH,
};

const FULL_USER: RouteAccessContext = {
  role: "BUSINESS_USER",
  permissions: ["delivery_manage", "occurrence_manage", "integration_manage"],
  enabledModules: BOTH,
};

const READ_ONLY_USER: RouteAccessContext = {
  role: "BUSINESS_USER",
  permissions: ["delivery_manage"],
  enabledModules: BOTH,
};

const DRIVER: RouteAccessContext = {
  role: "BUSINESS_USER",
  permissions: [],
  enabledModules: BOTH,
  isDriver: true,
};

describe("pages restricted by role (ACT-ROUTE-1)", () => {
  it("offers the company activity feed to the admin only", () => {
    expect(canAccessPath("/dashboard/activity", ADMIN)).toBe(true);

    // The API answers this feed to BUSINESS_ADMIN only; ⌘K offered it to
    // every employee and the edge sent them back to /dashboard.
    expect(canAccessPath("/dashboard/activity", FULL_USER)).toBe(false);
    expect(canAccessPath("/dashboard/activity", READ_ONLY_USER)).toBe(false);
  });

  it("keeps the MASTER's own feed to the MASTER", () => {
    expect(canAccessPath("/admin/activity", MASTER)).toBe(true);
    expect(canAccessPath("/admin/activity", ADMIN)).toBe(false);
  });
});

describe("integrations belong to Entregas (decision 4.3)", () => {
  it("disappear for a company that hired only the fleet", () => {
    expect(
      canAccessPath("/dashboard/integrations", {
        ...ADMIN,
        enabledModules: ["FLEET"],
      }),
    ).toBe(false);
  });

  it("stay for a company with Entregas and a profile with the key", () => {
    expect(canAccessPath("/dashboard/integrations", ADMIN)).toBe(true);
    expect(canAccessPath("/dashboard/integrations", FULL_USER)).toBe(true);
    expect(canAccessPath("/dashboard/integrations", READ_ONLY_USER)).toBe(
      false,
    );
  });
});

describe("a profile row that is not readable (ROUTE-KEY-1)", () => {
  it("counts only the rows with canRead", () => {
    expect(
      readablePermissionKeys([
        { permissionKey: "delivery_manage", canRead: false },
        { permissionKey: "vehicle_manage", canRead: true },
      ]),
    ).toEqual(["vehicle_manage"]);
  });

  it("does not open the page its key names", () => {
    const context: RouteAccessContext = {
      role: "BUSINESS_USER",
      permissions: readablePermissionKeys([
        { permissionKey: "delivery_manage", canRead: false },
      ]),
      enabledModules: BOTH,
    };

    expect(canAccessPath("/dashboard/deliveries", context)).toBe(false);
  });

  it("keeps an older payload without the flag readable", () => {
    expect(
      readablePermissionKeys([{ permissionKey: "driver_manage" }]),
    ).toEqual(["driver_manage"]);
  });
});

describe("the driver's vehicle pages (DRV-WEB-1)", () => {
  it("resolve to their own entry, not to /driver/vehicles by prefix", () => {
    expect(findAppRoute("/driver/vehicles/v-1/fuels")?.path).toBe(
      "/driver/vehicles/:vehicleId/fuels",
    );
    expect(findAppRoute("/driver/vehicles/v-1/service-orders")?.path).toBe(
      "/driver/vehicles/:vehicleId/service-orders",
    );
    expect(findAppRoute("/driver/vehicles")?.path).toBe("/driver/vehicles");
  });

  it("need FLEET, while the vehicle list does not", () => {
    const deliveriesOnly = { ...DRIVER, enabledModules: ["DELIVERIES"] };

    expect(canAccessPath("/driver/vehicles/v-1/fuels", deliveriesOnly)).toBe(
      false,
    );
    expect(
      canAccessPath("/driver/vehicles/v-1/service-orders", deliveriesOnly),
    ).toBe(false);
    expect(canAccessPath("/driver/vehicles", deliveriesOnly)).toBe(true);

    expect(canAccessPath("/driver/vehicles/v-1/fuels", DRIVER)).toBe(true);
  });

  it("are not reachable by somebody who is not a driver", () => {
    // The edge bounces an employee, an admin and the MASTER from /driver;
    // canAccessPath used to answer true for them, since the rule was only
    // written the other way round.
    for (const context of [FULL_USER, READ_ONLY_USER, ADMIN, MASTER]) {
      expect(canAccessPath("/driver/vehicles", context), context.role).toBe(
        false,
      );
      expect(
        canAccessPath("/driver/vehicles/v-1/fuels", context),
        context.role,
      ).toBe(false);
      expect(canAccessPath("/driver/kanban", context), context.role).toBe(
        false,
      );
    }

    // Even a /driver page the registry does not list yet.
    expect(
      canAccessPath("/driver/nova-pagina", FULL_USER, {
        unregistered: "allow",
      }),
    ).toBe(false);

    // Segment-aware: a path that merely starts with the letters is not it.
    expect(isDriverOnlyPath("/drivers")).toBe(false);
    expect(isDriverOnlyPath("/driver")).toBe(true);
  });

  it("keep the driver on the driver's surface", () => {
    // The driver surface is the driver's; a driver never lands on the
    // company's pages.
    expect(canAccessPath("/dashboard/vehicle", DRIVER)).toBe(false);
    expect(canAccessPath("/driver/vehicles", DRIVER)).toBe(true);
  });

  it("do not let a parameter swallow a literal segment", () => {
    // Segment-aware: /dashboard/vehicle-checklist is its own page.
    expect(findAppRoute("/dashboard/vehicle-checklist")?.path).toBe(
      "/dashboard/vehicle-checklist",
    );
  });
});

describe("the tabs of Entregas (DLV-RO-2)", () => {
  it("drop the occurrence types for a profile without occurrence_manage", () => {
    const tabs = accessibleDeliveryTabs(READ_ONLY_USER);

    expect(tabs).not.toContain("occurrence-types");

    // Read-only still sees every tab its key reads.
    expect(tabs).toEqual([
      "deliveries",
      "shippers",
      "imports",
      "status-change-reasons",
      "message-templates",
    ]);
  });

  it("keep all six for the admin, the MASTER and the full profile", () => {
    // The operation's four moved to the Torre (meeting of 14/10/2026).
    expect(accessibleDeliveryTabs(ADMIN)).toHaveLength(6);
    expect(accessibleDeliveryTabs(MASTER)).toHaveLength(6);
    expect(accessibleDeliveryTabs(FULL_USER)).toHaveLength(6);
  });

  it("open a forbidden tab from a link on the first one the profile may read", () => {
    const allowed = accessibleDeliveryTabs(READ_ONLY_USER);

    expect(parseDeliveryTab("occurrence-types", allowed)).toBe("deliveries");
    expect(parseDeliveryTab("imports", allowed)).toBe("imports");
    expect(parseDeliveryTab("nao-existe", allowed)).toBe("deliveries");
  });
});

describe("the views of the Torre (meeting of 14/10/2026)", () => {
  it("drop the occurrences for a profile without occurrence_manage, like their old tab", () => {
    expect(accessibleTowerViews(READ_ONLY_USER)).toEqual([
      "routes",
      "panel",
      "tickets",
      "audit",
    ]);
    expect(accessibleTowerViews(ADMIN)).toHaveLength(5);
    expect(accessibleTowerViews(MASTER)).toHaveLength(5);
  });
});

describe("every registered page carries a rule the product can explain", () => {
  it("names a module on every page of a module and a role on role-only pages", () => {
    const byPath = new Map(appRoutes.map((route) => [route.path, route]));

    for (const path of [
      "/dashboard/deliveries",
      "/dashboard/routes",
      "/dashboard/control-tower",
      "/dashboard/integrations",
      "/admin/integrations",
    ]) {
      expect(byPath.get(path)?.requiredModule, path).toBe("DELIVERIES");
    }

    expect(byPath.get("/dashboard/activity")?.allowedRoles).toEqual([
      "BUSINESS_ADMIN",
    ]);
  });
});

describe("the breadcrumbs of a page under an id", () => {
  it("name the page and link the real path", () => {
    expect(getRouteHierarchy("/driver/vehicles/v-1/fuels", appRoutes)).toEqual([
      { title: "Veículos", link: "/driver/vehicles" },
      { title: "Abastecimentos", link: "/driver/vehicles/v-1/fuels" },
    ]);
  });

  it("keep the plain pages as they were", () => {
    expect(getRouteHierarchy("/dashboard/deliveries", appRoutes)).toEqual([
      { title: "Dashboard", link: "/dashboard" },
      { title: "Entregas", link: "/dashboard/deliveries" },
    ]);
  });
});
