"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Kept by the global listener, so the number is already right when the
  // page is opened from anywhere else — and stays right without the chat
  // tab ever being clicked. Zero for support, which keeps no read cursor.
  const unreadCount = useChatUnreadCount();

  const handleChangeTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("tab", value);

    // Pagination and search belong to the table being left behind.
    params.delete("page");
    params.delete("search");

    router.push(`?${params.toString()}`);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleChangeTab}
      /**
       * `min-w-0` + `max-w-full` is what makes the list's `overflow-x-auto`
       * work at all.
       *
       * With only `lg:w-auto`, from 1024px up the tab strip started sizing to
       * its content — 1431px inside a 768px area — and `TabsList`'s
       * `overflow-x-auto` never engaged, because a container that grows to
       * fit its content has nothing left to scroll. The trailing tabs ended
       * up off-screen and unreachable.
       */
      className="w-full min-w-0 max-w-full lg:w-auto"
    >
      <TabsList
        data-tutorial="deliveries-tabs"
        className="w-full max-w-full justify-start
        overflow-x-auto lg:w-auto"
      >
        {DELIVERY_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.value];

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              // Each tab is its own guided tour; the provider reads this to
              // know which one applies.
              data-tutorial={`deliveries-tab-${tab.value}`}
              className="flex flex-1 items-center space-x-1
              px-2 sm:px-3 lg:flex-initial"
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>

              {/* The notification accent, the same constant the bell reads
              — including the ring, which is what lifts the badge off
              whatever it sits on. "You have something waiting" has to look
              like one thing in the product, not like two counters that
              happen to be nearby. */}
              {tab.value === "chat" && unreadCount > 0 && (
                <span
                  className={cn(
                    `flex h-5 min-w-5 items-center justify-center rounded-full
                    px-1 text-[10px] font-bold text-white ring-2
                    ring-background`,
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
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export { DeliveriesTabs };
