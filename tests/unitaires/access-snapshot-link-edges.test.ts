import { describe, expect, it } from "vitest";

import { accessSnapshotChanged } from "@/app/(protected)/_components/layout/hooks/access-snapshot";
import { canOpenNotificationLink } from "@/app/(protected)/_components/layout/protected-notifications-menu/link-access";

/**
 * Edges left alive by the 06/10 mutation run in two small access rules: a
 * role change alone, a module list that becomes unknown, and a notification
 * link that is relative or cannot be parsed.
 */

const snapshot = (
  over: Partial<Parameters<typeof accessSnapshotChanged>[0]> = {},
) => ({
  role: "BUSINESS_USER",
  permissions: [
    { permissionKey: "fuel_manage", canRead: true, canWrite: false },
  ],
  enabledModules: ["FLEET"] as readonly string[] | null,
  ...over,
});

describe("accessSnapshotChanged", () => {
  it("is a change when only the role changed", () => {
    expect(
      accessSnapshotChanged(snapshot(), snapshot({ role: "BUSINESS_ADMIN" })),
    ).toBe(true);
  });

  it("is no change when the new module list is not confirmed yet", () => {
    expect(
      accessSnapshotChanged(snapshot(), snapshot({ enabledModules: null })),
    ).toBe(false);
  });
});

describe("canOpenNotificationLink", () => {
  const admin = {
    role: "BUSINESS_ADMIN" as const,
    enabledModules: ["FLEET", "DELIVERIES"],
  };

  it("reads a relative link's path", () => {
    expect(canOpenNotificationLink("/dashboard/fuel?x=1", admin)).toBe(true);
    expect(
      canOpenNotificationLink("/admin/business", { role: "MASTER" as const }),
    ).toBe(true);
  });

  it("refuses a link that cannot be parsed", () => {
    expect(canOpenNotificationLink("http://[broken", admin)).toBe(false);
  });
});
