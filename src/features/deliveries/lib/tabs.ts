import type { PermissionKey } from "@/app/(protected)/_components/shared/common.types";

import {
  canAccessRequirement,
  type RouteAccessContext,
} from "@/lib/route-access";

type DeliveryTab =
  | "deliveries"
  | "occurrences"
  | "monitoring"
  | "chat"
  | "shippers"
  | "occurrence-types"
  | "status-change-reasons"
  | "imports"
  | "message-templates"
  | "proof-audits";

interface DeliveryTabDefinition {
  value: DeliveryTab;
  label: string;
  /**
   * The READ key the tab's own endpoint checks. The page needs
   * `delivery_manage` (app-routes), but the two occurrence tabs read
   * `occurrence_manage` (list-occurrences, list-occurrence-type): shown to a
   * profile without it, they answered 403 and read as "Módulo Entregas não
   * contratado" (DLV-RO-2).
   */
  requiredPermission: PermissionKey;
}

/**
 * The tabs of Entregas, and the one source for them: the strip, the server
 * page (before it fetches) and the guided tour read this list.
 */
const DELIVERY_TABS: DeliveryTabDefinition[] = [
  {
    value: "deliveries",
    label: "Entregas",
    requiredPermission: "delivery_manage",
  },
  {
    value: "occurrences",
    label: "Ocorrências",
    requiredPermission: "occurrence_manage",
  },
  {
    value: "monitoring",
    label: "Monitoramento",
    requiredPermission: "delivery_manage",
  },
  // Decision 14.5: the chat became support tickets. The URL value stays
  // "chat" so saved links and the company selector's allowlist keep working.
  {
    value: "chat",
    label: "Atendimentos",
    requiredPermission: "delivery_manage",
  },
  {
    value: "shippers",
    label: "Embarcadores",
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
    value: "imports",
    label: "Importações",
    requiredPermission: "delivery_manage",
  },
  {
    value: "message-templates",
    label: "Mensagens ao Cliente",
    requiredPermission: "delivery_manage",
  },
  {
    value: "proof-audits",
    label: "Auditoria de Comprovantes",
    requiredPermission: "delivery_manage",
  },
];

/** The tabs this session may read, in display order. */
function accessibleDeliveryTabs(context: RouteAccessContext): DeliveryTab[] {
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
  allowed: readonly DeliveryTab[] = DELIVERY_TABS.map((tab) => tab.value),
): DeliveryTab {
  const known = DELIVERY_TABS.some((tab) => tab.value === value);

  if (known && allowed.includes(value as DeliveryTab)) {
    return value as DeliveryTab;
  }

  return allowed[0] ?? "deliveries";
}

/**
 * The params that belong to the page, not to the table on screen: the
 * company picked on /admin and the page size the viewer chose.
 */
const PAGE_PARAMS = ["businessId", "pageSize"] as const;

/**
 * The link to another tab. Everything else in the URL — page, search, sort,
 * order, facet filters (status, severity, occurrenceTypeId…), a chat deep
 * link — belongs to the table being left behind: carried over, the next
 * tab's request sent a sort key or facet its endpoint refuses with a 400, or
 * filtered by a column it does not have. The open tab keeps its URL as is,
 * so clicking it again does not wipe its filters.
 *
 * "Open" is judged by the URL's own tab, not only by what rendered: a
 * forbidden or unknown `?tab=` falls back to another tab, and the params in
 * that URL belong to the tab it named, not to the fallback.
 */
function deliveryTabHref(
  current: Pick<URLSearchParams, "get" | "toString">,
  activeTab: DeliveryTab,
  tab: DeliveryTab,
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
  accessibleDeliveryTabs,
  deliveryTabHref,
  parseDeliveryTab,
};
export type { DeliveryTab, DeliveryTabDefinition };
