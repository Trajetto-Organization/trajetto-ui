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

import { SegmentedNav } from "@/components/ui/segmented-nav";
import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";

import { DELIVERY_TABS, type DeliveryTab } from "../lib/tabs";
import { useChatUnreadCount } from "../chat/lib/use-chat-unread";

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
}

/**
 * The tab lives in the URL so the page can be rendered on the server: each
 * tab is a different table with its own pagination, and a shared link must
 * reopen exactly what the sender was looking at.
 */
const DeliveriesTabs = ({ activeTab }: DeliveriesTabsProps): JSX.Element => {
  const searchParams = useSearchParams();

  // Kept by the global listener, so the number is already right when the
  // page is opened from anywhere else — and stays right without the chat
  // tab ever being clicked. Zero for support, which keeps no read cursor.
  const unreadCount = useChatUnreadCount();

  const hrefFor = (value: string): string => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", value);

    // Pagination and search belong to the table being left behind.
    params.delete("page");
    params.delete("search");

    return `?${params.toString()}`;
  };

  return (
    <SegmentedNav
      label="Seções de entregas"
      activeValue={activeTab}
      hrefFor={hrefFor}
      dataTutorial="deliveries-tabs"
      items={DELIVERY_TABS.map((tab) => ({
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
          tab.value === "chat" && unreadCount > 0 ? (
            <span
              className={cn(
                `flex h-5 min-w-5 items-center justify-center rounded-full
                px-1 text-[10px] font-bold text-white ring-2 ring-background`,
                NOTIFICATION_ACCENT_CLASS,
              )}
              aria-label={`${unreadCount} ${
                unreadCount === 1
                  ? "conversa não lida"
                  : "conversas não lidas"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : undefined,
      }))}
    />
  );
};

export { DeliveriesTabs };
