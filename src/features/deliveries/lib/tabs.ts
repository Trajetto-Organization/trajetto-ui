import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

import {
  canAccessRequirement,
  type RouteAccessContext,
} from "@/lib/route-access";

/**
 * The sections of Entregas' strip since the product meeting of 14/10/2026:
 * what is registered or imported — "tudo que for cadastro" stays here.
 */
type DeliveryStripTab =
  | "deliveries"
  | "shippers"
  | "imports"
  | "occurrence-types"
  | "status-change-reasons"
  | "message-templates";

/**
 * The four sections the same meeting moved to the Torre de controle, as
 * views of the operation: the board by route, the occurrences, the tickets
 * and the proof audit. Their `?tab=` values still reach Entregas from old
 * links, and are redirected (movedDeliveryTabHref).
 */
type MovedDeliveryTab = "monitoring" | "occurrences" | "chat" | "proof-audits";

/**
 * Every section the Entregas components can render: the strip's and the
 * moved ones, which the Torre shows with the same stats, table and actions
 * (the occurrences) or panels.
 */
type DeliveryTab = DeliveryStripTab | MovedDeliveryTab;

interface DeliveryTabDefinition {
  value: DeliveryStripTab;
  label: string;
  /**
   * The READ key the tab's own endpoint checks. The page needs
   * `delivery_manage` (app-routes), but the occurrence types read
   * `occurrence_manage` (list-occurrence-type): shown to a profile without
   * it, the tab answered 403 and read as "Módulo Entregas não contratado"
   * (DLV-RO-2).
   */
  requiredPermission: PermissionKey;
}

/**
 * The tabs of Entregas, and the one source for them: the strip, the server
 * page (before it fetches) and the guided tour read this list. Registrations
 * first, then their configuration (meeting of 14/10/2026; "Mensagens ao
 * cliente" is a set of templates, configuration like the other two).
 */
const DELIVERY_TABS: DeliveryTabDefinition[] = [
  {
    value: "deliveries",
    label: "Entregas",
    requiredPermission: "delivery_manage",
  },
  {
    value: "shippers",
    label: "Embarcadores",
    requiredPermission: "delivery_manage",
  },
  {
    value: "imports",
    label: "Importações",
    requiredPermission: "delivery_manage",
  },
  {
    value: "occurrence-types",
    label: "Tipos de Ocorrência",
    requiredPermission: "occurrence_manage",
  },
  {
    value: "status-change-reasons",
    label: "Motivos de Status",
    requiredPermission: "delivery_manage",
  },
  {
    value: "message-templates",
    label: "Mensagens ao Cliente",
    requiredPermission: "delivery_manage",
  },
];

/**
 * Where each moved section lives now: the Torre's `?view=` (see
 * features/control-tower/lib/views). Kept as plain strings here so this
 * module does not depend on the Torre's.
 */
const MOVED_DELIVERY_TABS: Record<MovedDeliveryTab, string> = {
  monitoring: "routes",
  occurrences: "occurrences",
  chat: "tickets",
  "proof-audits": "audit",
};

function isMovedDeliveryTab(value: unknown): value is MovedDeliveryTab {
  // Own keys only: `in` also accepted inherited names (?tab=constructor,
  // ?tab=toString) and redirected with a function's source as the view.
  return typeof value === "string" && Object.hasOwn(MOVED_DELIVERY_TABS, value);
}

/** The tabs this session may read, in display order. */
function accessibleDeliveryTabs(
  context: RouteAccessContext,
): DeliveryStripTab[] {
  return DELIVERY_TABS.filter((tab) =>
    canAccessRequirement(
      { requiredPermission: tab.requiredPermission },
      context,
    ),
  ).map((tab) => tab.value);
}

/**
 * The tab to render. Anything unknown in the URL falls back to the first
 * tab; a tab the session may not read falls back to the first one it may,
 * so a shared link never opens on a refusal. `allowed` omitted = all tabs.
 */
function parseDeliveryTab(
  value: string | undefined,
  allowed: readonly DeliveryStripTab[] = DELIVERY_TABS.map((tab) => tab.value),
): DeliveryStripTab {
  const known = DELIVERY_TABS.some((tab) => tab.value === value);

  if (known && allowed.includes(value as DeliveryStripTab)) {
    return value as DeliveryStripTab;
  }

  return allowed[0] ?? "deliveries";
}

/**
 * Where an old link to a moved section goes: the same area's Torre, on the
 * section's view, with every other param kept — the company, the search,
 * the occurrences' filters, a ticket or chat deep link. Notifications,
 * e-mails and bookmarks written before the move keep working. Null when the
 * link is not to a moved section.
 *
 * The monitoring tab's own `view` (routes / drivers, the board by driver
 * dropped by the same meeting) is replaced by the Torre's.
 */
function movedDeliveryTabHref(
  area: "/admin" | "/dashboard",
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const tab = searchParams.tab;

  if (!isMovedDeliveryTab(tab)) return null;

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "tab" || key === "view") continue;

    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      params.append(key, item);
    }
  }

  params.set("view", MOVED_DELIVERY_TABS[tab]);

  return `${area}/control-tower?${params.toString()}`;
}

/**
 * The params that belong to the page, not to the table on screen: the
 * company picked on /admin and the page size the viewer chose.
 */
const PAGE_PARAMS = ["businessId", "pageSize"] as const;

/**
 * The link to another tab. Everything else in the URL — page, search, sort,
 * order, facet filters (status, kind, is_active…), the period — belongs to
 * the table being left behind: carried over, the next tab's request sent a
 * sort key or facet its endpoint refuses with a 400, or filtered by a column
 * it does not have. The open tab keeps its URL as is, so clicking it again
 * does not wipe its filters.
 *
 * "Open" is judged by the URL's own tab, not only by what rendered: a
 * forbidden or unknown `?tab=` falls back to another tab, and the params in
 * that URL belong to the tab it named, not to the fallback.
 */
function deliveryTabHref(
  current: Pick<URLSearchParams, "get" | "toString">,
  activeTab: DeliveryStripTab,
  tab: DeliveryStripTab,
): string {
  const urlTab = current.get("tab");
  const urlIsActiveTab = urlTab === null || urlTab === activeTab;

  if (tab === activeTab && urlIsActiveTab) {
    const query = current.toString();

    return query ? `?${query}` : `?tab=${tab}`;
  }

  const next = new URLSearchParams();

  for (const key of PAGE_PARAMS) {
    const value = current.get(key);

    if (value) next.set(key, value);
  }

  next.set("tab", tab);

  return `?${next.toString()}`;
}

export {
  DELIVERY_TABS,
  MOVED_DELIVERY_TABS,
  accessibleDeliveryTabs,
  deliveryTabHref,
  isMovedDeliveryTab,
  movedDeliveryTabHref,
  parseDeliveryTab,
};
export type {
  DeliveryStripTab,
  DeliveryTab,
  DeliveryTabDefinition,
  MovedDeliveryTab,
};
