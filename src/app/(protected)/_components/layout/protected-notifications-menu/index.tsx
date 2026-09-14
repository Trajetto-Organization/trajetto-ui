"use client";

import { useState } from "react";

import { Bell, BellOff, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  getNotificationVisual,
  NOTIFICATION_ACCENT_CLASS as ACCENT_CLASS,
} from "../../shared/notification-visuals";

import {
  handleMarkAllNotificationsAsRead,
  handleMarkNotificationAsRead,
} from "@/actions/notifications";
import {
  useNotificationsContext,
  type Notification,
} from "../protected-provider/notifications-provider";

/**
 * The bell next to the command bar: at-a-glance unread count and the latest
 * few notifications, one click from anywhere. The full history stays on
 * /notifications — this menu is the shortcut, not the archive.
 */

const PREVIEW_LIMIT = 6;

function relativeDate(value: Notification["created_at"]): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

const NotificationPreview = ({ item }: { item: Notification }) => {
  const { markNotificationAsRead } = useNotificationsContext();
  const [isMarking, setIsMarking] = useState(false);

  const { icon: Icon, chip } = getNotificationVisual(item.type);
  const unread = !item.read;

  // Reading by clicking must not depend on the navigation: mark first (server
  // then local state), then let the link do its job.
  const markRead = async () => {
    if (!unread || isMarking) return;
    setIsMarking(true);

    try {
      const result = await handleMarkNotificationAsRead(item.id);
      if (result.successMessage) markNotificationAsRead(item.id);
    } finally {
      setIsMarking(false);
    }
  };

  const content = (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          chip,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread && "font-semibold",
            )}
          >
            {item.title}
          </span>
          <span
            className="shrink-0 text-[10px] tabular-nums
            text-muted-foreground"
          >
            {relativeDate(item.created_at)}
          </span>
        </span>
        <span
          className="mt-0.5 block line-clamp-2 text-xs
          leading-relaxed text-muted-foreground"
        >
          {item.message}
        </span>
      </span>

      {unread && (
        <span
          className={cn("mt-2 size-2 shrink-0 rounded-full", ACCENT_CLASS)}
          aria-label="Não lida"
        />
      )}
    </>
  );

  return (
    <DropdownMenuItem asChild className="p-0 focus:bg-accent">
      {item.link ? (
        <a
          href={item.link}
          className="flex w-full cursor-pointer items-start gap-3 px-3 py-3"
          onClick={() => void markRead()}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          className="flex w-full cursor-pointer items-start gap-3
          px-3 py-3 text-left"
          onClick={() => void markRead()}
        >
          {content}
        </button>
      )}
    </DropdownMenuItem>
  );
};

const ProtectedNotificationsMenu = (): JSX.Element => {
  const {
    notifications,
    unreadCount,
    connected,
    markAllNotificationsAsRead,
  } = useNotificationsContext();

  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const markAll = async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);

    try {
      const result = await handleMarkAllNotificationsAsRead();
      if (result.successMessage) markAllNotificationsAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  const preview = [...notifications]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, PREVIEW_LIMIT);

  return (
    <DropdownMenu>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="relative size-9 shrink-0 rounded-lg shadow-none"
                aria-label={
                  unreadCount
                    ? `Notificações: ${unreadCount} não lidas`
                    : "Notificações"
                }
              >
                <Bell className="size-4" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    className={cn(
                      `absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center
                      justify-center rounded-full px-1 text-[10px] font-bold
                      text-white ring-2 ring-background`,
                      ACCENT_CLASS,
                    )}
                    aria-hidden="true"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {unreadCount
                ? `Abrir notificações (${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"})`
                : "Abrir notificações"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1rem))] p-0"
      >
        <DropdownMenuLabel
          className="flex items-center justify-between
          gap-3 px-4 py-3"
        >
          <span>
            <span className="block text-sm font-semibold">Notificações</span>
            <span
              className="block text-xs font-normal
              text-muted-foreground"
            >
              {unreadCount === 0
                ? "Tudo em dia"
                : `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`}
            </span>
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-normal",
              connected ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                connected ? "bg-emerald-500" : "bg-muted-foreground",
              )}
            />
            {connected ? "Tempo real" : "Reconectando"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {preview.length ? (
          // The app's scrollbar, not the browser's. Radix sizes the viewport
          // from the root, so the max height must land on both.
          <ScrollArea
            className="max-h-96
            [&>[data-radix-scroll-area-viewport]]:max-h-96"
          >
            <div className="py-1">
              {preview.map((item) => (
                <NotificationPreview key={item.id} item={item} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <BellOff className="mb-3 size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Nenhuma notificação</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Novos avisos aparecerão aqui.
            </p>
          </div>
        )}

        <DropdownMenuSeparator className="m-0" />
        <div className="flex items-center justify-between gap-2 p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || isMarkingAll}
            onClick={() => void markAll()}
            className="h-8 px-2 text-xs"
          >
            <CheckCheck className="mr-1.5 size-3.5" />
            Marcar todas
          </Button>

          <DropdownMenuItem asChild className="p-0">
            <a
              href="/notifications"
              className="cursor-pointer rounded-md px-3 py-2
              text-xs font-semibold text-primary"
            >
              Ver todas
            </a>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ProtectedNotificationsMenu };
