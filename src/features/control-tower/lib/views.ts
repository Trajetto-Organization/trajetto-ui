import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

import {
  canAccessRequirement,
  type RouteAccessContext,
} from "@/lib/route-access";

import { MOVED_DELIVERY_TABS } from "@/features/deliveries/lib/tabs";

/**
 * The views of the Torre de controle (product meeting of 14/10/2026).
 *
 * The Torre was one panel, and the operation's other screens lived as tabs
 * of Entregas between the registrations: Monitoramento, Ocorrências,
 * Atendimentos and Auditoria de comprovantes. The meeting moved them here as
 * views the dispatcher chooses, with the board by route — the screen it
 * named the most important — as the default, and the map panel beside it.
 *
 * `?view=` in the URL, so a link reopens the same view and the server
 * renders it (the occurrences are a server-side table). No directive: the
 * server page and the client strip read it.
 */
type TowerView = "routes" | "panel" | "occurrences" | "tickets" | "audit";

interface TowerViewDefinition {
  value: TowerView;
  label: string;
  /**
   * The READ key the view's own endpoint checks, the one its tab had on
   * Entregas: the occurrences read `occurrence_manage` (list-occurrences),
   * everything else `delivery_manage` like the page.
   */
  requiredPermission: PermissionKey;
}

const TOWER_VIEWS: TowerViewDefinition[] = [
  { value: "routes", label: "Rotas", requiredPermission: "delivery_manage" },
  { value: "panel", label: "Painel", requiredPermission: "delivery_manage" },
  {
    value: "occurrences",
    label: "Ocorrências",
    requiredPermission: "occurrence_manage",
  },
  {
    value: "tickets",
    label: "Atendimentos",
    requiredPermission: "delivery_manage",
  },
  { value: "audit", label: "Auditoria", requiredPermission: "delivery_manage" },
];

/** What the Torre opens on: the board by route. */
const DEFAULT_TOWER_VIEW: TowerView = "routes";

function isTowerView(value: unknown): value is TowerView {
  return TOWER_VIEWS.some((view) => view.value === value);
}

/** The views this session may read, in display order. */
function accessibleTowerViews(context: RouteAccessContext): TowerView[] {
  return TOWER_VIEWS.filter((view) =>
    canAccessRequirement(
      { requiredPermission: view.requiredPermission },
      context,
    ),
  ).map((view) => view.value);
}

/**
 * The view to render. Unknown or absent falls back to the default; a view
 * the session may not read falls back to the first one it may, so a shared
 * link never opens on a refusal. `allowed` omitted = every view.
 */
function parseTowerView(
  value: string | null | undefined,
  allowed: readonly TowerView[] = TOWER_VIEWS.map((view) => view.value),
): TowerView {
  if (isTowerView(value) && allowed.includes(value)) return value;

  if (allowed.includes(DEFAULT_TOWER_VIEW)) return DEFAULT_TOWER_VIEW;

  return allowed[0] ?? DEFAULT_TOWER_VIEW;
}

/**
 * The params that belong to the Torre, not to the view on screen: the
 * company picked on /admin and the page size the viewer chose. A view's
 * table filters, page and deep links stay behind on a switch, like the tabs
 * of Entregas (lib/tabs).
 */
const TOWER_PAGE_PARAMS = ["businessId", "pageSize"] as const;

/** The link to a view: the open one keeps its URL, another starts clean. */
function towerViewHref(
  current: Pick<URLSearchParams, "get" | "toString">,
  activeView: TowerView,
  view: TowerView,
): string {
  const urlView = current.get("view");
  const urlIsActive = urlView === null || urlView === activeView;

  if (view === activeView && urlIsActive) {
    const query = current.toString();

    return query ? `?${query}` : `?view=${view}`;
  }

  const next = new URLSearchParams();

  for (const key of TOWER_PAGE_PARAMS) {
    const value = current.get(key);

    if (value) next.set(key, value);
  }

  next.set("view", view);

  return `?${next.toString()}`;
}

/** Where the last view chosen in this browser is kept. */
const TOWER_VIEW_STORAGE_KEY = "trajetto:control-tower:view";

/** The view this browser chose last, or null (private window, cleared data). */
function readRememberedTowerView(): TowerView | null {
  try {
    const stored = window.localStorage.getItem(TOWER_VIEW_STORAGE_KEY);

    return isTowerView(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Said on the window when the remembered view changes in this tab: the
 * `storage` event only reaches the OTHER tabs, and the menu's link to the
 * Torre must follow a view chosen while it is on screen.
 */
const TOWER_VIEW_CHANGE_EVENT = "trajetto:control-tower:view-change";

function rememberTowerView(view: TowerView): void {
  try {
    if (window.localStorage.getItem(TOWER_VIEW_STORAGE_KEY) === view) return;

    window.localStorage.setItem(TOWER_VIEW_STORAGE_KEY, view);
  } catch {
    // Storage refused: the URL still names the view.
    return;
  }

  window.dispatchEvent(new Event(TOWER_VIEW_CHANGE_EVENT));
}

/** Calls back when the remembered view may have changed (this tab or another). */
function subscribeRememberedTowerView(onChange: () => void): () => void {
  window.addEventListener(TOWER_VIEW_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);

  return () => {
    window.removeEventListener(TOWER_VIEW_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * A link INTO the Torre (the menu, ⌘K) with the view this browser chose
 * last, so the server renders that view at once. With a bare link it
 * rendered Rotas and the shell replaced it on the client: the wrong view
 * flashed and the page was rendered twice. Any other path, or no choice,
 * stays as it is.
 */
function towerEntryHref(path: string, remembered: TowerView | null): string {
  if (!remembered || !/\/control-tower$/.test(path)) return path;

  return `${path}?view=${remembered}`;
}

// The moved tabs of Entregas land on these views; a typo on either side
// would send an old link to the default view without a word.
for (const view of Object.values(MOVED_DELIVERY_TABS)) {
  if (!isTowerView(view)) {
    throw new Error(`Visão da torre desconhecida: ${view}`);
  }
}

export {
  DEFAULT_TOWER_VIEW,
  TOWER_PAGE_PARAMS,
  TOWER_VIEWS,
  TOWER_VIEW_CHANGE_EVENT,
  TOWER_VIEW_STORAGE_KEY,
  accessibleTowerViews,
  isTowerView,
  parseTowerView,
  readRememberedTowerView,
  rememberTowerView,
  subscribeRememberedTowerView,
  towerEntryHref,
  towerViewHref,
};
export type { TowerView, TowerViewDefinition };
