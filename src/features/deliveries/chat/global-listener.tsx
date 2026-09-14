"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "react-query";

import { getSocket, initializeSocket } from "@/socket";
import { useAuthStore } from "@/store/auth-store";

import type { SentChatMessage } from "@/actions/chat/chat.types";

import {
  THREADS_REFRESH_COALESCE_MS,
  useChatAccess,
  useChatUnreadCount,
} from "./lib/use-chat-unread";

import { useDeliveryReceipt } from "./lib/use-delivery-receipt";

/**
 * The chat's ears, mounted with the layout instead of with the panel.
 *
 * Both things this fixes came from the same place: the socket listener used
 * to live inside `ChatPanel`, so the browser was deaf to the chat unless the
 * chat tab happened to be open. The dispatcher on the Kanban never saw the
 * unread count, and the driver's message was never confirmed as received by
 * anyone — his single check stayed single while the message was, in fact,
 * sitting in a browser of the company.
 *
 * Renders nothing: it keeps the shared counter alive and answers the socket.
 */
const ChatGlobalListener = (): null => {
  const queryClient = useQueryClient();

  const myUserId = useAuthStore((state) => state.id);

  const { canUseChat } = useChatAccess();

  // Mounted here so the counter keeps refetching while the user is anywhere
  // else in the app. The badges read this same cache entry, never a copy.
  useChatUnreadCount();

  /**
   * The team receipt, from any screen: if this browser holds the message,
   * the base holds it — whether or not the conversation is on screen.
   *
   * Support never reports one: `canUseChat` is false for a MASTER, and the
   * API answers 403 CHAT_DELIVERY_RECEIPT_NOT_ALLOWED to it anyway.
   */
  const reportDelivered = useDeliveryReceipt({ enabled: canUseChat });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A broadcast reply, a fleet coming online after a deploy: bursts are the
  // normal case, and one refetch each would hammer the API for a single
  // visible change. Same window the panel uses, from the same constant.
  const scheduleThreadsRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      queryClient.invalidateQueries(["chat-threads"]);
    }, THREADS_REFRESH_COALESCE_MS);
  }, [queryClient]);

  useEffect(
    () => () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    // No module, no permission, or support: nothing binds and nothing is
    // requested — not even the socket listeners.
    if (!canUseChat) return;

    let disposed = false;
    let boundSocket: ReturnType<typeof getSocket> = null;

    const handleChatMessage = (payload?: SentChatMessage) => {
      if (disposed) return;

      scheduleThreadsRefresh();

      if (!payload?.threadId || !payload.created_at) return;

      // The echo of our own send is not a reception.
      if (payload.senderId === myUserId) return;

      /**
       * The stamp is the message's own `created_at` — what this browser
       * really has. `Date.now()` would cover messages that have not arrived
       * yet, and the hook keeps only the furthest stamp of each burst.
       *
       * With the chat tab open the panel confirms the visible conversation
       * as well, so that one thread is reported twice. Left as is: the
       * server cursor is monotonic and idempotent, and the alternative is
       * for this listener to track which conversation some other component
       * happens to be showing.
       */
      reportDelivered(payload.threadId, payload.created_at);
    };

    // Somebody read a thread — here or on another agent's screen. The count
    // is the server's, so it is asked again rather than adjusted.
    const handleChatRead = () => {
      if (disposed) return;

      scheduleThreadsRefresh();
    };

    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        boundSocket = socket;

        socket.on("chatMessage", handleChatMessage);
        socket.on("chatRead", handleChatRead);
      })
      .catch(() => {
        // Without realtime the counter still refreshes on mount and focus.
      });

    return () => {
      disposed = true;

      boundSocket?.off("chatMessage", handleChatMessage);
      boundSocket?.off("chatRead", handleChatRead);
    };
  }, [canUseChat, myUserId, reportDelivered, scheduleThreadsRefresh]);

  return null;
};

export { ChatGlobalListener };
