"use client";

import { useQuery } from "react-query";

import { listChatThreads } from "@/actions/chat/list-chat-threads";

import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";

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
 * The badge only ever needs `totalUnread`, and the API counts that against
 * the reader's cursor over every thread of the company — not over the page
 * it happens to return. So one thread is all this query has to carry.
 */
const UNREAD_PAGE_SIZE = 1;

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
 * How many conversations are waiting for this company, from any screen.
 *
 * The number is never accumulated here: it is `list-threads`' own
 * `totalUnread`, computed from the reader's cursor. A counter incremented on
 * each socket event would drift the moment a colleague read a thread, or a
 * message arrived while the tab slept.
 *
 * Every caller shares one cache entry, so the listener that keeps it fresh
 * and the badges that display it cost a single request between them.
 */
function useChatUnreadCount(): number {
  const { canUseChat } = useChatAccess();

  const { data } = useQuery(
    CHAT_UNREAD_QUERY_KEY,
    async () => {
      const result = await listChatThreads({
        page: 1,
        pageSize: UNREAD_PAGE_SIZE,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message);
      }

      return result.data.totalUnread;
    },
    { enabled: canUseChat, refetchOnWindowFocus: true },
  );

  // A session that lost access keeps no stale badge from the cache.
  return canUseChat ? (data ?? 0) : 0;
}

export {
  useChatAccess,
  useChatUnreadCount,
  CHAT_UNREAD_QUERY_KEY,
  THREADS_REFRESH_COALESCE_MS,
};
