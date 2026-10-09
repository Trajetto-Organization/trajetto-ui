import {
  parseDeliveryTab,
  type DeliveryTab,
} from "@/features/deliveries/lib/tabs";
import { parseIntegrationTab } from "@/features/integrations/lib/tabs";

/**
 * Which tour belongs to the screen on display.
 *
 * One function, used by the provider, the sidebar's "Ver Tutorial" and the
 * "?" shortcut. The old provider guessed the tab of Entregas from
 * `[role=tab][data-state=active]`, but the strip is made of links with
 * `aria-current`: the guess always fell back to the first tab, five tab tours
 * never opened, and the menu computed yet another key. The tab of Entregas
 * and Integrações lives in the URL, so the URL is what is read here.
 */

interface TutorialKeyInput {
  pathname: string;
  /** `?tab=` of the URL. */
  urlTab?: string | null;
  /** The dashboard's own (client-side) tab: overview, charts, limits or system. */
  dashboardTab?: string | null;
  /** Tabs of Entregas this session may read; a forbidden `?tab=` falls back like the page does. */
  allowedDeliveryTabs?: readonly DeliveryTab[];
}

const DASHBOARD_SUB_TABS = new Set(["charts", "limits", "system"]);

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");

  return trimmed === "" ? "/" : trimmed;
}

function resolveTutorialKey({
  pathname,
  urlTab,
  dashboardTab,
  allowedDeliveryTabs,
}: TutorialKeyInput): string {
  const path = normalizePath(pathname);
  const section = /^\/(dashboard|admin)(?=\/|$)/.exec(path)?.[0];

  if (section && path === section) {
    return dashboardTab && DASHBOARD_SUB_TABS.has(dashboardTab)
      ? `${section}/${dashboardTab}`
      : section;
  }

  if (section && path === `${section}/deliveries`) {
    const tab = parseDeliveryTab(urlTab ?? undefined, allowedDeliveryTabs);

    return tab === "deliveries" ? path : `${path}/${tab}`;
  }

  if (section && path === `${section}/integrations`) {
    return `${path}/${parseIntegrationTab(urlTab ?? undefined)}`;
  }

  // Detail pages share one tour whatever the record.
  if (section && new RegExp(`^${section}/routes/[^/]+$`).test(path)) {
    return `${section}/routes/:routeId`;
  }

  const vehiclePage =
    /^\/driver\/vehicles\/[^/]+\/(fuels|service-orders)$/.exec(path);

  if (vehiclePage) return `/driver/vehicles/:vehicleId/${vehiclePage[1]}`;

  return path;
}

export { resolveTutorialKey, normalizePath };
export type { TutorialKeyInput };
