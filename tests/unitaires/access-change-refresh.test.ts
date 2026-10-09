import { describe, expect, it } from "vitest";

import { accessSnapshotChanged } from "@/app/(protected)/_components/layout/hooks/access-snapshot";
import { driverVehicleOptions } from "@/app/(protected)/_components/driver/vehicles/vehicle-action-modal/options";

/**
 * SSR-STALE-1: after `permissions_changed` or `entitlementsChanged` the store
 * redrew the menus, but what the server rendered — the tabs of Entregas, a
 * "sem permissão" state — stayed until the next navigation. The security
 * check now renders the page again when, and only when, the access changed.
 */
const base = {
  role: "BUSINESS_USER",
  permissions: [
    { permissionKey: "delivery_manage", canRead: true, canWrite: true },
    { permissionKey: "occurrence_manage", canRead: true, canWrite: false },
  ],
  enabledModules: ["DELIVERIES", "FLEET"],
};

describe("when the page is rendered again", () => {
  it("not for the same access in another order", () => {
    expect(
      accessSnapshotChanged(base, {
        ...base,
        permissions: [...base.permissions].reverse(),
        enabledModules: ["FLEET", "DELIVERIES"],
      }),
    ).toBe(false);
  });

  it("when a permission is taken away", () => {
    expect(
      accessSnapshotChanged(base, {
        ...base,
        permissions: base.permissions.slice(0, 1),
      }),
    ).toBe(true);
  });

  it("when write becomes read-only", () => {
    expect(
      accessSnapshotChanged(base, {
        ...base,
        permissions: [
          { permissionKey: "delivery_manage", canRead: true, canWrite: false },
          base.permissions[1],
        ],
      }),
    ).toBe(true);
  });

  it("when a module is switched off", () => {
    expect(
      accessSnapshotChanged(base, { ...base, enabledModules: ["FLEET"] }),
    ).toBe(true);
  });

  it("not for the first answer after the page loaded", () => {
    // Nothing had been confirmed yet: the server just rendered with it.
    expect(
      accessSnapshotChanged(
        { role: null, permissions: [], enabledModules: null },
        base,
      ),
    ).toBe(false);
  });

  it("not while the modules are still unknown", () => {
    expect(accessSnapshotChanged({ ...base, enabledModules: null }, base)).toBe(
      false,
    );
  });
});

/**
 * DRV-WEB-1: the driver's vehicle card offered "Ver abastecimentos" and
 * "Ver ordens de serviço" to every driver; a company without FLEET got the
 * page and the API's "módulo não habilitado" behind it.
 */
describe("what the driver's vehicle card offers", () => {
  it("nothing without FLEET, so the card does not open a menu", () => {
    expect(
      driverVehicleOptions({
        role: "BUSINESS_USER",
        enabledModules: ["DELIVERIES"],
      }),
    ).toEqual([]);
  });

  it("both pages with FLEET, pointing at the vehicle", () => {
    const options = driverVehicleOptions({
      role: "BUSINESS_USER",
      enabledModules: ["FLEET", "DELIVERIES"],
    });

    expect(options.map((option) => option.key)).toEqual([
      "fuels",
      "service-orders",
    ]);
    expect(options[0].hrefFor("v-1")).toBe("/driver/vehicles/v-1/fuels");
  });
});
