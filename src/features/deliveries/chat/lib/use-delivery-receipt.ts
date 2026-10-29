"use client";

import { useCallback, useEffect, useRef } from "react";

import { markChatDelivered } from "@/actions/chat/mark-chat-delivered";

/**
 * A broadcast reply, a driver dumping five messages at once, a thread
 * opening with forty messages already loaded — all of that is a single
 * fact ("received up to here") and must cost a single request.
 */
const RECEIPT_COALESCE_MS = 800;

interface DeliveryReceiptOptions {
  /** False for the MASTER: the API refuses it, so nothing is even tried. */
  enabled: boolean;

  /** Only the MASTER carries one, and it never gets here — kept for parity. */
  businessId?: string;
}

/**
 * Reports how far this panel has actually received a thread.
 *
 * Call it with the stamp of the newest message that came from the server and
 * from the *other* side: an optimistic copy or a message of our own would
 * move the team cursor past messages nobody received, and `Date.now()` would
 * cover messages that have not arrived yet.
 *
 * The call is deliberately silent — a receipt is a courtesy check on someone
 * else's screen, never a reason to interrupt whoever is typing here.
 */
function useDeliveryReceipt({
  enabled,
  businessId,
}: DeliveryReceiptOptions): (threadId: string, deliveredAt: string) => void {
  // threadId -> highest stamp waiting to be sent, plus its pending timer.
  const pendingRef = useRef<Record<string, string>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const enabledRef = useRef<boolean>(enabled);
  const businessIdRef = useRef<string | undefined>(businessId);

  useEffect(() => {
    enabledRef.current = enabled;
    businessIdRef.current = businessId;
  }, [enabled, businessId]);

  useEffect(
    () => () => {
      Object.values(timersRef.current).forEach(clearTimeout);

      timersRef.current = {};
      pendingRef.current = {};
    },
    [],
  );

  return useCallback((threadId: string, deliveredAt: string) => {
    if (!enabledRef.current || !threadId || !deliveredAt) return;

    const current = pendingRef.current[threadId];

    // Events arrive out of order often enough: only the furthest stamp of
    // the burst is worth reporting, and a stale one must never win.
    if (!current || new Date(deliveredAt) > new Date(current)) {
      pendingRef.current[threadId] = deliveredAt;
    }

    if (timersRef.current[threadId]) return;

    timersRef.current[threadId] = setTimeout(() => {
      delete timersRef.current[threadId];

      const stamp = pendingRef.current[threadId];

      delete pendingRef.current[threadId];

      if (!stamp || !enabledRef.current) return;

      void markChatDelivered({
        threadId,
        deliveredAt: stamp,
        businessId: businessIdRef.current,
      });
    }, RECEIPT_COALESCE_MS);
  }, []);
}

export { useDeliveryReceipt, RECEIPT_COALESCE_MS };
