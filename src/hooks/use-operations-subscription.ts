"use client";

import { useEffect } from "react";

import { getSocket, initializeSocket } from "@/socket";

/**
 * Keeps this tab inside the operations room of `businessId`.
 *
 * That room is where route events and driver positions go. It has a
 * permission check on it — not everyone in a company may watch the whole
 * fleet move — and two things follow from that:
 *
 *   1. A MASTER has no company of their own and works over whichever one is
 *      selected, so the server cannot guess the room and waits to be asked.
 *      Without this subscription the tower has no live dots for a master
 *      seat, which is exactly how it behaved before.
 *   2. Rooms live on the server and die with the connection that joined them,
 *      while Socket.IO reconnects the transport on its own. Every `connect` —
 *      the first and each one after a blip — has to subscribe again, or the
 *      map silently stops moving and looks, from the outside, like a fleet
 *      that parked.
 *
 * Users who already belong to the company are put in the room at handshake
 * time; subscribing again is harmless and is what covers their reconnections.
 *
 * Mirrors `useChatSubscription` deliberately: same lifecycle, same failure
 * modes, same shape, so the two cannot drift apart.
 */
function useOperationsSubscription(businessId?: string): void {
  useEffect(() => {
    if (!businessId) return;

    let disposed = false;
    let boundSocket: ReturnType<typeof getSocket> = null;

    const handleConnect = () => {
      boundSocket?.emit("operationsSubscribe", { businessId });
    };

    initializeSocket()
      .then((socket) => {
        // The panel can be gone before the socket answers; subscribing here
        // would leave the room joined with nobody listening.
        if (disposed) return;

        boundSocket = socket;

        socket.on("connect", handleConnect);

        // The promise only settles on a connected socket, so `connect` has
        // already fired for this one: the first subscription is emitted by
        // hand and the listener above covers every reconnection after it.
        socket.emit("operationsSubscribe", { businessId });
      })
      .catch(() => {
        // No realtime at all: the panel still refetches on its timer.
      });

    return () => {
      disposed = true;

      boundSocket?.off("connect", handleConnect);

      // A disconnected socket already lost the room, and the queued emit
      // would only land after a reconnection this panel no longer wants.
      if (boundSocket?.connected) {
        boundSocket.emit("operationsUnsubscribe", { businessId });
      }
    };
  }, [businessId]);
}

export { useOperationsSubscription };
