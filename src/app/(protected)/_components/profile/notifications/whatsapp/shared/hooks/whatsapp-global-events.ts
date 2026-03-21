"use client";

import { useEffect, useRef } from "react";
import { useNotificationsContext } from "@/app/(protected)/_components/layout/protected-provider/notifications-provider";

import type { UseWhatsAppGlobalEventsProps } from "../common.types";

function useWhatsAppGlobalEvents({
  onConnectionUpdate,
  onWhatsAppDisabled,
  onModalShouldClose,
}: UseWhatsAppGlobalEventsProps) {
  const { subscribeToWhatsAppEvents } = useNotificationsContext();
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Clear previous subscriptions
    unsubscribeFunctions.current.forEach((unsubscribe) => unsubscribe());
    unsubscribeFunctions.current = [];

    // Subscribe to connection updates
    if (onConnectionUpdate) {
      const unsubscribe = subscribeToWhatsAppEvents(
        "whatsapp_connection",
        (notification) => {
          const isConnected = notification.data?.connected || false;
          onConnectionUpdate(isConnected, notification.data);

          // If connected, should close modal
          if (isConnected && onModalShouldClose) {
            setTimeout(() => {
              onModalShouldClose();
            }, 1500); // Small delay to show success message
          }
        },
      );
      unsubscribeFunctions.current.push(unsubscribe);
    }

    // Subscribe to disabled events
    if (onWhatsAppDisabled) {
      const unsubscribe = subscribeToWhatsAppEvents(
        "whatsapp_disabled",
        (notification) => {
          onWhatsAppDisabled(notification.data);
        },
      );
      unsubscribeFunctions.current.push(unsubscribe);

      // Subscribe to instance cleanup events (treat like disabled)
      const unsubscribeCleanup = subscribeToWhatsAppEvents(
        "whatsapp_instance_cleanup",
        (notification) => {
          onWhatsAppDisabled(notification.data);
        },
      );
      unsubscribeFunctions.current.push(unsubscribeCleanup);
    }

    // Cleanup
    return () => {
      unsubscribeFunctions.current.forEach((unsubscribe) => unsubscribe());
      unsubscribeFunctions.current = [];
    };
  }, [
    onConnectionUpdate,
    onWhatsAppDisabled,
    onModalShouldClose,
    subscribeToWhatsAppEvents,
  ]);
}

export { useWhatsAppGlobalEvents };
