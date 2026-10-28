"use client";

import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  MessageSquareWarning,
  Package,
  Send,
  TriangleAlert,
  Users,
} from "lucide-react";

import { readablePermissionKeys } from "@/lib/route-access";

import { useAuthStore } from "@/store/auth-store";

import { SegmentedNav } from "@/components/ui/segmented-nav";

import {
  DELIVERY_TABS,
  accessibleDeliveryTabs,
  deliveryTabHref,
  type DeliveryStripTab,
} from "../lib/tabs";

const TAB_ICONS: Record<DeliveryStripTab, typeof Package> = {
  deliveries: Package,
  shippers: Users,
  imports: FileSpreadsheet,
  "occurrence-types": TriangleAlert,
  "status-change-reasons": MessageSquareWarning,
  "message-templates": Send,
};

interface DeliveriesTabsProps {
  activeTab: DeliveryStripTab;
  /**
   * The tabs the server found this session may read (lib/tabs). Omitted,
   * every tab — the server could not tell, and each tab's own request stays
   * the gate.
   */
  allowedTabs?: DeliveryStripTab[];
}

/**
 * The tabs to draw: the server's verdict, narrowed by the live store. A
 * permission removed while the page is open disappears here at once, before
 * the page is rendered again (SSR-STALE-1).
 */
function useVisibleTabs(
  allowedTabs: DeliveryStripTab[] | undefined,
): DeliveryStripTab[] {
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const enabledModules = useAuthStore((state) => state.enabledModules);

  const fromServer = allowedTabs ?? DELIVERY_TABS.map((tab) => tab.value);

  if (!role) return fromServer;

  const live = accessibleDeliveryTabs({
    role,
    permissions: readablePermissionKeys(permissions),
    enabledModules,
  });

  return fromServer.filter((tab) => live.includes(tab));
}

/**
 * The tab lives in the URL so the page can be rendered on the server: each
 * tab is a different table with its own pagination, and a shared link must
 * reopen exactly what the sender was looking at.
 *
 * Only the registrations since the product meeting of 14/10/2026: the
 * operation's sections (Monitoramento, Ocorrências, Atendimentos and
 * Auditoria) are views of the Torre de controle, and the tickets' badge
 * went with them.
 */
const DeliveriesTabs = ({
  activeTab,
  allowedTabs,
}: DeliveriesTabsProps): JSX.Element => {
  const searchParams = useSearchParams();
  const visibleTabs = useVisibleTabs(allowedTabs);

  // Only the page's own params survive a tab switch (lib/tabs).
  const hrefFor = (value: string): string =>
    deliveryTabHref(searchParams, activeTab, value as DeliveryStripTab);

  return (
    <SegmentedNav
      label="Seções de entregas"
      activeValue={activeTab}
      hrefFor={hrefFor}
      dataTutorial="deliveries-tabs"
      items={DELIVERY_TABS.filter(
        // The open tab stays drawn even if the store just dropped it: the
        // refresh on its way replaces the whole page, tab included.
        (tab) => visibleTabs.includes(tab.value) || tab.value === activeTab,
      ).map((tab) => ({
        value: tab.value,
        label: tab.label,
        icon: TAB_ICONS[tab.value],
        // Each tab is its own guided tour; the provider reads this to know
        // which one applies.
        dataTutorial: `deliveries-tab-${tab.value}`,
      }))}
    />
  );
};

export { DeliveriesTabs };
