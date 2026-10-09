import { describe, expect, it } from "vitest";

import { canOpenNotificationLink } from "@/app/(protected)/_components/layout/protected-notifications-menu/link-access";

/**
 * A notification's link, after the reader's access changed (NOTIF-ROLE-1).
 *
 * The bell kept every link live. A notification about a delivery, received
 * while the profile could read Entregas, still opened /dashboard/deliveries
 * after the profile (or the company's plan) no longer allowed it — a click
 * that ends on the access-denied redirect. The same verdict as the sidebar
 * decides it now, and a link the reader cannot open is drawn inert.
 */
const deliveries = "/dashboard/deliveries?tab=deliveries&delivery=abc";

const clerk = (
  permissions: string[],
  enabledModules: string[] | null = ["DELIVERIES", "FLEET"],
) => ({
  role: "BUSINESS_USER" as const,
  permissions: permissions as never,
  enabledModules,
  isDriver: false,
});

describe("a notification link", () => {
  it("opens for a profile that reads the page", () => {
    expect(
      canOpenNotificationLink(deliveries, clerk(["delivery_manage"])),
    ).toBe(true);
  });

  it("is inert for a profile that lost the page", () => {
    expect(canOpenNotificationLink(deliveries, clerk(["vehicle_manage"]))).toBe(
      false,
    );
  });

  it("is inert when the company no longer has the module", () => {
    expect(
      canOpenNotificationLink(
        deliveries,
        clerk(["delivery_manage"], ["FLEET"]),
      ),
    ).toBe(false);
  });

  it("is judged on its path when the API sent it absolute", () => {
    expect(
      canOpenNotificationLink(
        `https://app.trajetto.test${deliveries}`,
        clerk(["vehicle_manage"]),
      ),
    ).toBe(false);
  });

  it("opens a driver's own page for the driver", () => {
    expect(
      canOpenNotificationLink("/driver/vehicles", {
        role: "BUSINESS_USER",
        permissions: [],
        enabledModules: ["FLEET"],
        isDriver: true,
      }),
    ).toBe(true);
  });

  it("stays open while the session is not known yet", () => {
    expect(canOpenNotificationLink(deliveries, null)).toBe(true);
    expect(
      canOpenNotificationLink(deliveries, clerk(["delivery_manage"], null)),
    ).toBe(true);
  });
});
