"use client";

import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Map as MapIcon,
  MessageCircle,
  Route as RouteIcon,
  ScanEye,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { readablePermissionKeys } from "@/lib/route-access";

import { useAuthStore } from "@/store/auth-store";

import { SegmentedNav } from "@/components/ui/segmented-nav";
import { NOTIFICATION_ACCENT_CLASS } from "@/app/(protected)/_components/shared/notification-visuals";

import { useTicketsSummary } from "@/features/deliveries/chat/lib/use-chat-unread";
import { ticketBadge } from "@/features/deliveries/chat/lib/ticket-keys";

import {
  TOWER_VIEWS,
  accessibleTowerViews,
  towerViewHref,
  type TowerView,
} from "../lib/views";

const VIEW_ICONS: Record<TowerView, typeof RouteIcon> = {
  routes: RouteIcon,
  panel: MapIcon,
  occurrences: ClipboardList,
  tickets: MessageCircle,
  audit: ScanEye,
};

interface ControlTowerViewTabsProps {
  activeView: TowerView;
  /**
   * The views the server found this session may read. Omitted, every view —
   * the server could not tell, and each view's own request stays the gate.
   */
  allowedViews?: readonly TowerView[];
}

/**
 * The views to draw: the server's verdict, narrowed by the live store. A
 * permission removed while the Torre is open disappears here at once, before
 * the page is rendered again (SSR-STALE-1).
 */
function useVisibleViews(
  allowedViews: readonly TowerView[] | undefined,
): readonly TowerView[] {
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.permissions);
  const enabledModules = useAuthStore((state) => state.enabledModules);

  const fromServer = allowedViews ?? TOWER_VIEWS.map((view) => view.value);

  if (!role) return fromServer;

  const live = accessibleTowerViews({
    role,
    permissions: readablePermissionKeys(permissions),
    enabledModules,
  });

  return fromServer.filter((view) => live.includes(view));
}

/**
 * The views of the Torre, in the URL (`?view=`) so the server renders the
 * one chosen and a shared link reopens it. Atendimentos carries the tickets'
 * badge, moved here with the tickets from Entregas.
 */
const ControlTowerViewTabs = ({
  activeView,
  allowedViews,
}: ControlTowerViewTabsProps): JSX.Element => {
  const searchParams = useSearchParams();
  const visibleViews = useVisibleViews(allowedViews);

  // Kept by the global listener, so the number is already right when the
  // Torre is opened from anywhere else. Zero for support, which keeps no
  // read cursor. The red dot: a driver waits for the tower's authorization.
  const summary = useTicketsSummary();
  const { count: unreadCount, urgent } = ticketBadge(summary);
  const waitingAuthorization = summary?.pendingAuthorization ?? 0;

  return (
    <SegmentedNav
      label="Visões da torre de controle"
      activeValue={activeView}
      hrefFor={(value) =>
        towerViewHref(searchParams, activeView, value as TowerView)
      }
      dataTutorial="control-tower-views"
      items={TOWER_VIEWS.filter(
        // The open view stays drawn even if the store just dropped it: the
        // refresh on its way replaces the whole page, view included.
        (view) =>
          visibleViews.includes(view.value) || view.value === activeView,
      ).map((view) => ({
        value: view.value,
        label: view.label,
        icon: VIEW_ICONS[view.value],
        // Each view is its own guided tour; the provider reads the URL.
        dataTutorial: `control-tower-view-${view.value}`,
        badge:
          /* The notification accent, the same constant the bell reads. */
          view.value === "tickets" && (unreadCount > 0 || urgent) ? (
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

export { ControlTowerViewTabs };
