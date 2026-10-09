"use client";

import { useSearchParams } from "next/navigation";
import {
  Activity,
  ClipboardList,
  FileSpreadsheet,
  MessageCircle,
  MessageSquareWarning,
  Package,
  ScanEye,
  Send,
  TriangleAlert,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { readablePermissionKeys } from "@/lib/route-access";

import { useAuthStore } from "@/store/auth-store";

import { SegmentedNav } from "@/components/ui/segmented-nav";
import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";

import {
  DELIVERY_TABS,
  accessibleDeliveryTabs,
  deliveryTabHref,
  type DeliveryTab,
} from "../lib/tabs";
import { useTicketsSummary } from "../chat/lib/use-chat-unread";
import { ticketBadge } from "../chat/lib/ticket-rules";

const TAB_ICONS = {
  deliveries: Package,
  occurrences: ClipboardList,
  monitoring: Activity,
  chat: MessageCircle,
  shippers: Users,
  "occurrence-types": TriangleAlert,
  "status-change-reasons": MessageSquareWarning,
  imports: FileSpreadsheet,
  "message-templates": Send,
  "proof-audits": ScanEye,
} as const;

interface DeliveriesTabsProps {
  activeTab: DeliveryTab;
  /**
   * The tabs the server found this session may read (lib/tabs). Omitted,
   * every tab — the server could not tell, and each tab's own request stays
   * the gate.
   */
  allowedTabs?: DeliveryTab[];
}

/**
 * The tabs to draw: the server's verdict, narrowed by the live store. A
 * permission removed while the page is open disappears here at once, before
 * the page is rendered again (SSR-STALE-1).
 */
function useVisibleTabs(allowedTabs: DeliveryTab[] | undefined): DeliveryTab[] {
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
 */
const DeliveriesTabs = ({
  activeTab,
  allowedTabs,
}: DeliveriesTabsProps): JSX.Element => {
  const searchParams = useSearchParams();
  const visibleTabs = useVisibleTabs(allowedTabs);

  // Kept by the global listener, so the number is already right when the
  // page is opened from anywhere else — and stays right without the tickets
  // tab ever being clicked. Zero for support, which keeps no read cursor.
  // The red dot: a driver waits for the tower's authorization (design §6.1).
  const summary = useTicketsSummary();
  const { count: unreadCount, urgent } = ticketBadge(summary);
  const waitingAuthorization = summary?.pendingAuthorization ?? 0;

  // Only the page's own params survive a tab switch (lib/tabs).
  const hrefFor = (value: string): string =>
    deliveryTabHref(searchParams, activeTab, value as DeliveryTab);

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
        badge:
          /* The notification accent, the same constant the bell reads —
             including the ring, which is what lifts the badge off whatever it
             sits on. "You have something waiting" has to look like one thing
             in the product, not like two counters that happen to be nearby. */
          tab.value === "chat" && (unreadCount > 0 || urgent) ? (
            <span className="flex items-center gap-1">
              {unreadCount > 0 && (
                <span
                  className={cn(
                    `flex h-5 min-w-5 items-center justify-center rounded-full
                    px-1 text-[10px] font-bold text-white ring-2 ring-background`,
                    NOTIFICATION_ACCENT_CLASS,
                  )}
                  aria-label={`${unreadCount} ${
                    unreadCount === 1
                      ? "atendimento não lido"
                      : "atendimentos não lidos"
                  }`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {urgent && (
                <span
                  data-authorization-dot=""
                  role="img"
                  className="h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background"
                  aria-label={`${waitingAuthorization} ${
                    waitingAuthorization === 1
                      ? "pedido aguardando autorização"
                      : "pedidos aguardando autorização"
                  }`}
                />
              )}
            </span>
          ) : undefined,
      }))}
    />
  );
};

export { DeliveriesTabs };
