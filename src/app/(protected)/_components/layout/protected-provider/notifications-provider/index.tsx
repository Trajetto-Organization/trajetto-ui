"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import { toast } from "sonner";
import { initializeSocket, getSocket } from "@/socket";

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  read: boolean;
  created_at: string | Date;
}

interface NotificationsContextType {
  realtimeNotifications: Notification[];
  unreadCount: number;
  clearNotifications: () => void;
  removeNotification: (notificationId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  connected: boolean;
  syncWithServerData: (serverNotificationIds: string[]) => void;
  markAllNotificationsAsRead: () => void;
  subscribeToWhatsAppEvents: (
    eventType: string,
    callback: (data: any) => void,
  ) => () => void;
}

const NotificationsContext = createContext<NotificationsContextType>(
  {} as NotificationsContextType,
);

const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    Notification[]
  >([]);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);

  const socketInitialized = useRef(false);
  const notificationIdsReceived = useRef<Set<string>>(new Set());

  // Custom event dispatcher for WhatsApp notifications
  const whatsAppEventDispatcher = useRef<{
    [key: string]: ((data: any) => void)[];
  }>({});

  // Function to handle WhatsApp notifications
  const handleWhatsAppNotification = (notification: any) => {
    // Dispatch to registered callbacks
    const eventType = notification.type;
    if (whatsAppEventDispatcher.current[eventType]) {
      whatsAppEventDispatcher.current[eventType].forEach((callback) => {
        callback(notification);
      });
    }

    const getToastMessage = (type: string, data: any) => {
      switch (type) {
        case "whatsapp_connection":
          return data?.connected
            ? { message: "WhatsApp conectado com sucesso!", type: "success" }
            : { message: "WhatsApp foi desconectado", type: "warning" };
        case "whatsapp_disabled":
          return {
            message: "WhatsApp foi desabilitado automaticamente",
            type: "warning",
          };
        case "whatsapp_instance_cleanup":
          return {
            message:
              notification.message ||
              "Seu WhatsApp foi desconectado porque outro usuário se conectou com este número",
            type: "warning",
          };
        default:
          return {
            message: notification.message || "Atualização WhatsApp",
            type: "info",
          };
      }
    };

    const toastData = getToastMessage(eventType, notification.data);

    // Display toast with unique ID to avoid duplication
    if (toastData.type === "success") {
      toast.success(toastData.message, {
        id: `whatsapp-${eventType}`,
      });
    } else if (toastData.type === "warning") {
      toast.warning(toastData.message, {
        id: `whatsapp-${eventType}`,
      });
    } else {
      toast.info(toastData.message, {
        id: `whatsapp-${eventType}`,
      });
    }
  };

  // Function to subscribe to WhatsApp events
  const subscribeToWhatsAppEvents = (
    eventType: string,
    callback: (data: any) => void,
  ) => {
    if (!whatsAppEventDispatcher.current[eventType]) {
      whatsAppEventDispatcher.current[eventType] = [];
    }

    whatsAppEventDispatcher.current[eventType].push(callback);

    // Return unsubscribe function
    return () => {
      if (whatsAppEventDispatcher.current[eventType]) {
        whatsAppEventDispatcher.current[eventType] =
          whatsAppEventDispatcher.current[eventType].filter(
            (cb) => cb !== callback,
          );
      }
    };
  };

  const syncWithServerData = (serverNotificationIds: string[]) => {
    setRealtimeNotifications((prev) => {
      const filtered = prev.filter(
        (notification) => !serverNotificationIds.includes(notification.id),
      );

      // Recalculates the unreadCount based on the remaining notifications
      const newUnreadCount = filtered.filter((n) => !n.read).length;
      setUnreadCount(newUnreadCount);

      // Remove IDs from the set if they are no longer in real-time notifications.
      const remainingIds = new Set(filtered.map((n) => n.id));
      notificationIdsReceived.current = remainingIds;

      return filtered;
    });
  };

  useEffect(() => {
    if (socketInitialized.current) return;

    // Initialize the socket
    const setupSocketListeners = async () => {
      try {
        await initializeSocket();
        const socket = getSocket();

        if (!socket) {
          toast.error(
            "Houve um erro ao se conectar ao serviço de notificações!",
            {
              duration: 5000,
              id: "socket-init-error",
            },
          );

          throw new Error("Falha ao inicializar o socket");
        }

        socketInitialized.current = true;

        // Update connection status
        setConnected(socket.connected);

        // Configure connection listeners
        socket.on("connect", () => {
          setConnected(true);
        });

        socket.on("disconnect", () => {
          setConnected(false);
        });

        // Listener for new notifications
        socket.on("pushNotification", (notification: Notification) => {
          // Check if it's a WhatsApp specific notification
          const isWhatsAppNotification =
            notification.type?.startsWith("whatsapp_");

          if (isWhatsAppNotification) {
            // Handle WhatsApp notifications separately
            handleWhatsAppNotification(notification);
            return;
          }

          if (notificationIdsReceived.current.has(notification.id)) {
            return;
          }

          // Register ID to avoid duplication
          notificationIdsReceived.current.add(notification.id);

          // Format date before adding to list
          const formattedNotification = {
            ...notification,
            created_at: notification.created_at,
          };

          // Add to real-time notification list
          setRealtimeNotifications((prev) => {
            // Double check to avoid duplication
            if (prev.some((n) => n.id === notification.id)) {
              return prev;
            }

            return [formattedNotification, ...prev];
          });

          // Increment counter (only if notification is not in list and unread)
          if (!notification.read) {
            setUnreadCount((prev) => prev + 1);
          }

          // Show toast with notification
          toast.message("", {
            closeButton: true,
            action: (
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
            ),
          });

          // Play notification sound if supported
          try {
            const audio = new Audio("/sounds/notification.mp3");
            audio.play().catch((e) => {});
          } catch (error) {}

          // Show browser notification if allowed
          if (Notification.permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico",
            });
          }
        });

        // Request permission for browser notifications
        if (
          Notification.permission !== "denied" &&
          Notification.permission !== "granted"
        ) {
          Notification.requestPermission();
        }
      } catch (error) {
        toast.error("Não foi possível se conectar ao serviço de notificações", {
          duration: 5000,
          id: "socket-init-error",
        });
      }
    };

    setupSocketListeners();

    // Cleanup function
    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("pushNotification");
        socket.off("connect");
        socket.off("disconnect");
        socketInitialized.current = false;
      }
    };
  }, []);

  const removeNotification = (notificationId: string) => {
    // Check if notification is in real-time list
    const notificationToRemove = realtimeNotifications.find(
      (n) => n.id === notificationId,
    );

    if (notificationToRemove) {
      // Remove from notification list - use functional update to avoid stale state
      setRealtimeNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId),
      );

      // If it is an unread notification, reduce the count
      if (!notificationToRemove.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      // Remove the set ID to allow future notifications with the same ID
      notificationIdsReceived.current.delete(notificationId);
    }
  };

  const markNotificationAsRead = (notificationId: string) => {
    // Check if notification is in real-time list
    setRealtimeNotifications((prev) => {
      // Find the notification index
      const index = prev.findIndex((n) => n.id === notificationId);

      // If not found, return the current state without changes.
      if (index === -1) return prev;

      // If the notification has already been read, return the current state without changes.
      if (prev[index].read) return prev;

      // Otherwise, create a new array with the updated notification.
      const newNotifications = [...prev];
      newNotifications[index] = {
        ...newNotifications[index],
        read: true,
      };

      // Decrement the unread counter
      setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
      return newNotifications;
    });
  };

  const markAllNotificationsAsRead = useCallback(() => {
    setRealtimeNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  }, []);

  // Method to clear all notifications
  const clearNotifications = () => {
    setRealtimeNotifications([]);
    setUnreadCount(0);

    notificationIdsReceived.current.clear();
  };

  return (
    <NotificationsContext.Provider
      value={{
        realtimeNotifications,
        unreadCount,
        clearNotifications,
        removeNotification,
        markNotificationAsRead,
        connected,
        syncWithServerData,
        markAllNotificationsAsRead,
        subscribeToWhatsAppEvents,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

const useNotificationsContext = () => useContext(NotificationsContext);
export { NotificationsProvider, useNotificationsContext };
