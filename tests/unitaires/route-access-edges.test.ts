import { describe, expect, it } from "vitest";

import {
  accessDeniedRedirect,
  canAccessPath,
  canAccessRequirement,
  readablePermissionKeys,
  routeMatchesExactly,
} from "@/lib/route-access";

/**
 * Edges of the one page-access verdict left alive by the 06/10 mutation run:
 * the driver's surface path by path, a MASTER kept out by a page's roles,
 * trailing slashes and the root path, and where a refused user lands.
 */

const driver = { role: "BUSINESS_USER" as const, isDriver: true };

describe("the driver's surface", () => {
  it("is /driver, /profile and /notifications, each with its subpaths", () => {
    for (const path of [
      "/driver/kanban",
      "/profile",
      "/profile/security",
      "/notifications",
    ]) {
      expect(canAccessPath(path, driver)).toBe(true);
    }
  });

  it("is nothing else, registered or not", () => {
    expect(canAccessPath("/dashboard/deliveries", driver)).toBe(false);
    expect(canAccessPath("/profiles", driver)).toBe(false);
  });
});

describe("canAccessRequirement", () => {
  it("keeps a MASTER out of a page whose roles leave the MASTER out", () => {
    expect(
      canAccessRequirement(
        { allowedRoles: ["BUSINESS_ADMIN"] },
        { role: "MASTER" },
      ),
    ).toBe(false);
    expect(
      canAccessRequirement({ allowedRoles: ["MASTER"] }, { role: "MASTER" }),
    ).toBe(true);
    expect(canAccessRequirement({}, { role: "MASTER" })).toBe(true);
  });
});

describe("routeMatchesExactly", () => {
  it("matches the root path to itself", () => {
    expect(routeMatchesExactly({ path: "/", title: "Início" }, "/")).toBe(true);
  });

  it("ignores a trailing slash", () => {
    expect(
      routeMatchesExactly(
        { path: "/dashboard/fuel", title: "x" },
        "/dashboard/fuel/",
      ),
    ).toBe(true);
  });
});

describe("readablePermissionKeys", () => {
  it("is empty without rows", () => {
    expect(readablePermissionKeys(undefined)).toEqual([]);
    expect(readablePermissionKeys(null)).toEqual([]);
  });
});

describe("accessDeniedRedirect", () => {
  it("sends each kind of user to their own home", () => {
    expect(accessDeniedRedirect("MASTER")).toBe("/admin");
    expect(accessDeniedRedirect("BUSINESS_USER", true)).toBe("/profile");
    expect(accessDeniedRedirect("BUSINESS_USER")).toBe("/dashboard");
    expect(accessDeniedRedirect("BUSINESS_ADMIN", false)).toBe("/dashboard");
  });
});
