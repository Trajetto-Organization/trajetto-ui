"use client";

import { useQuery } from "react-query";

import type { TicketCounts } from "@/actions/chat/chat.types";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

import { fetchTicketsSummary } from "./chat-reads";

/**
 * One refetch of the thread list per burst of realtime events.
 *
 * Lives here rather than in the panel because the global listener coalesces
 * on the very same window: two different numbers would mean the badge and the
 * open conversation disagreed for half a second after every burst.
 */
const THREADS_REFRESH_COALESCE_MS = 500;

/** The module the whole chat hangs from. */
const DELIVERIES_MODULE = "DELIVERIES";

/**
 * Deliberately under the panel's own prefix: everything that already calls
 * `invalidateQueries(["chat-threads"])` — a thread being read, a broadcast
 * going out — refreshes this counter too, with no second bookkeeping.
 */
const CHAT_UNREAD_QUERY_KEY = ["chat-threads", "unread"];

/**
 * The tickets' summary (decision 14.5): the tab badge, the balloon's pill
 * and the filter counts share this one cache entry. Under the tickets' root,
 * so every `invalidateQueries(["chat-tickets"])` refreshes it too.
 */
const TICKETS_SUMMARY_QUERY_KEY = ["chat-tickets", "summary"];

/** Hoisted so the permission check memoizes on a stable reference. */
const DELIVERY_READ_REQUIREMENT = [
  {
    key: permissions.DELIVERY_MANAGE,
    action: "read" as const,
    label: getPermissionName(permissions.DELIVERY_MANAGE),
  },
];

interface ChatAccess {
  /** True only for a session allowed to list its own company's chat. */
  canUseChat: boolean;

  /** The MASTER reads every company and keeps no cursor of its own. */
  isSupportReadOnly: boolean;
}

/**
 * Who the chat surfaces outside the panel exist for.
 *
 * Support is excluded on purpose, the same way `ChatPanel` excludes it: a
 * MASTER reads every company but the API refuses to move a read cursor for
 * it, so an unread badge would sit lit forever counting messages nobody
 * expects support to answer.
 *
 * `enabledModules` is `null` while the session has not confirmed them yet.
 * The gate stays shut on that value: it becomes a real list on the first
 * render of the protected layout, and firing a request at a company that
 * never hired Entregas would only collect 403s.
 */
function useChatAccess(): ChatAccess {
  const role = useAuthStore((state) => state.role);
  const enabledModules = useAuthStore((state) => state.enabledModules);

  const readPermission = useCheckMultiplePermissions(DELIVERY_READ_REQUIREMENT);

  const isSupportReadOnly = role === "MASTER";
  const hasModule = (enabledModules ?? []).includes(DELIVERIES_MODULE);

  return {
    canUseChat:
      !isSupportReadOnly && hasModule && readPermission.hasAllPermissions,
    isSupportReadOnly,
  };
}

/**
 * The tickets' counts for this company, from any screen.
 *
 * Never accumulated here: the server derives them from cursors and partial
 * indexes; a counter incremented per socket event would drift the moment a
 * colleague read a ticket or the socket dropped an event. The socket only
 * says "ask again".
 */
function useTicketsSummary(): TicketCounts | null {
  const { canUseChat } = useChatAccess();

  // Through the relay, not a Server Action: it runs on every protected page
  // and on every focus, and as an action it held the queue every other read
  // of the page waited in.
  const { data } = useQuery(
    TICKETS_SUMMARY_QUERY_KEY,
    ({ signal }) => fetchTicketsSummary({}, { signal }),
    { enabled: canUseChat, refetchOnWindowFocus: true },
  );

  // A session that lost access keeps no stale numbers from the cache.
  return canUseChat ? (data ?? null) : null;
}

/**
 * The tab badge: open tickets with something unread for this reader
 * (design §6.1, it replaced the threads' `totalUnread`).
 */
function useChatUnreadCount(): number {
  return useTicketsSummary()?.unreadOpen ?? 0;
}

export {
  useChatAccess,
  useChatUnreadCount,
  useTicketsSummary,
  TICKETS_SUMMARY_QUERY_KEY,
  CHAT_UNREAD_QUERY_KEY,
  THREADS_REFRESH_COALESCE_MS,
};
