"use client";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

/**
 * What writing a refueling takes: the fuel key, plus reading the four
 * catalogs its wizard picks from. Without one of them a step would open on
 * an empty list; the button says which one is missing instead (the dashboard
 * copy's rule, now also on /admin).
 */
function useFuelWritePermissions() {
  return useCheckMultiplePermissions([
    {
      key: permissions.FUEL_MANAGE,
      action: "write",
      label: getPermissionName(permissions.FUEL_MANAGE),
    },
    {
      key: permissions.BRANCH_MANAGE,
      action: "read",
      label: getPermissionName(permissions.BRANCH_MANAGE),
    },
    {
      key: permissions.VEHICLE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.VEHICLE_MANAGE),
    },
    {
      key: permissions.DRIVER_MANAGE,
      action: "read",
      label: getPermissionName(permissions.DRIVER_MANAGE),
    },
    {
      key: permissions.FUEL_TYPE_MANAGE,
      action: "read",
      label: getPermissionName(permissions.FUEL_TYPE_MANAGE),
    },
  ]);
}

export { useFuelWritePermissions };
