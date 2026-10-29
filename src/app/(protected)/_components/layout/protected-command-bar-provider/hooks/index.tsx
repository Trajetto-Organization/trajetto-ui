import { useRouter } from "next/navigation";

import type {
  Action,
  UseCommandBarActions,
} from "../protected-command-bar-provider.types";

import { canAccessPath, readablePermissionKeys } from "@/lib/route-access";

import {
  readRememberedTowerView,
  towerEntryHref,
} from "@/features/control-tower/lib/views";

import {
  navigationSurface,
  paletteEntries,
  protectedNavIcons,
} from "../../protected-navbar-items";

/**
 * A driver is a BUSINESS_USER linked to a driver record — the same rule the
 * layout uses to pick the driver shell and the API uses to pick the driver
 * permission map.
 */
function isDriver(user: UseCommandBarActions["user"]): boolean {
  return user.role === "BUSINESS_USER" && Boolean(user.driverId);
}

/**
 * The palette's actions: the same navigation list the sidebar reads, run
 * through the same `canAccessPath`. An entry survives here exactly when its
 * page would open — which is why this list can no longer disagree with the
 * sidebar (NAV-DRIFT-1) or offer a page the edge then bounces (ACT-ROUTE-1).
 */
function useCommandBarActions({
  user,
  enabledModules = null,
}: UseCommandBarActions): { actions: Action[] } {
  const router = useRouter();

  const driver = isDriver(user);

  const context = {
    role: user.role,
    permissions: readablePermissionKeys(user.permissions),
    enabledModules,
    isDriver: driver,
  };

  const actions = paletteEntries(navigationSurface(user.role, driver))
    .filter((entry) => canAccessPath(entry.path, context))
    .map<Action>((entry) => {
      const Icon = protectedNavIcons[entry.icon];

      return {
        // The path is unique on a surface, and stable across renders.
        id: `nav:${entry.path}`,
        name: entry.paletteName ?? entry.title,
        section: entry.section,
        shortcut: entry.shortcut,
        keywords: entry.keywords,
        icon: <Icon className="w-5 h-5" />,
        // A page outside the panel opens in its own tab, as the sidebar does.
        // The Torre opens on the view this browser chose last, like the
        // sidebar's link (read at the click: nothing here is rendered).
        perform: () =>
          entry.newTab
            ? window.open(entry.path, "_blank", "noopener,noreferrer")
            : router.push(
                towerEntryHref(entry.path, readRememberedTowerView()),
              ),
        path: entry.path,
      };
    });

  return { actions };
}

export { useCommandBarActions };
