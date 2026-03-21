"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { toast } from "sonner";

import { formatNotificationDate } from "@/lib/format-values";
import { initializeSocket, getSocket, disconnectSocket } from "@/socket";

import { useAIVerificationStore } from "@/store/ai-verification-store";

// ============================================================================
// TYPES
// ============================================================================
interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  type: string;
  read: boolean;
  created_at: string | Date;
  _source?: "realtime" | "server"; // Track origin for debugging
  _receivedAt?: number; // Timestamp when received
}

interface NotificationState {
  // Single source of truth: Map<id, Notification>
  notifications: Map<string, Notification>;
  // Connection status
  connected: boolean;
  // Track if initial sync has happened
  isInitialized: boolean;
  // Last server sync timestamp
  lastServerSync: number;
}

type NotificationAction =
  | { type: "ADD_OR_UPDATE"; payload: Notification }
  | { type: "ADD_BATCH"; payload: Notification[] }
  | { type: "DELETE"; payload: string }
  | { type: "MARK_READ"; payload: string }
  | { type: "REPLACE_ALL"; payload: Notification[] }
  | {
      type: "SYNC_WITH_SERVER";
      payload: { serverNotifications: Notification[]; serverIds: string[] };
    }
  | { type: "SET_CONNECTED"; payload: boolean }
  | { type: "SET_INITIALIZED"; payload: boolean }
  | { type: "CLEAR_ALL" };

interface NotificationsContextType {
  // Derived state (computed from Map)
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  isInitialized: boolean;

  // Actions
  addNotification: (notification: Notification) => void;
  removeNotification: (notificationId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  syncWithServerData: (
    serverNotifications: Notification[],
    serverIds: string[],
  ) => void;
  replaceAllNotifications: (notifications: Notification[]) => void;

  // WhatsApp support
  subscribeToWhatsAppEvents: (
    eventType: string,
    callback: (data: any) => void,
  ) => () => void;
}

// ============================================================================
// REDUCER
// ============================================================================
function notificationReducer(
  state: NotificationState,
  action: NotificationAction,
): NotificationState {
  switch (action.type) {
    case "ADD_OR_UPDATE": {
      const newMap = new Map(state.notifications);
      const existing = newMap.get(action.payload.id);

      // Only update if new or if the incoming notification is newer
      if (
        !existing ||
        (action.payload._receivedAt || 0) >= (existing._receivedAt || 0)
      ) {
        newMap.set(action.payload.id, {
          ...action.payload,
          _receivedAt: action.payload._receivedAt || Date.now(),
        });
      }

      return { ...state, notifications: newMap };
    }

    case "ADD_BATCH": {
      const newMap = new Map(state.notifications);
      action.payload.forEach((notification) => {
        const existing = newMap.get(notification.id);
        if (
          !existing ||
          (notification._receivedAt || 0) >= (existing._receivedAt || 0)
        ) {
          newMap.set(notification.id, {
            ...notification,
            _receivedAt: notification._receivedAt || Date.now(),
          });
        }
      });
      return { ...state, notifications: newMap };
    }

    case "DELETE": {
      const newMap = new Map(state.notifications);

      newMap.delete(action.payload);
      return { ...state, notifications: newMap };
    }

    case "MARK_READ": {
      const newMap = new Map(state.notifications);
      const notification = newMap.get(action.payload);

      if (notification && !notification.read) {
        newMap.set(action.payload, { ...notification, read: true });
      }

      return { ...state, notifications: newMap };
    }

    case "REPLACE_ALL": {
      const newMap = new Map<string, Notification>();
      const now = Date.now();

      action.payload.forEach((notification) => {
        newMap.set(notification.id, {
          ...notification,
          _source: notification._source || "server",
          _receivedAt: notification._receivedAt || now,
        });
      });

      return {
        ...state,
        notifications: newMap,
        lastServerSync: now,
        isInitialized: true,
      };
    }

    case "SYNC_WITH_SERVER": {
      const { serverNotifications, serverIds } = action.payload;
      const newMap = new Map<string, Notification>();

      const now = Date.now();
      const serverIdSet = new Set(serverIds);

      // First, add all server notifications with descending index
      // to preserve backend order (newest first)
      serverNotifications.forEach((notification, index) => {
        newMap.set(notification.id, {
          ...notification,
          _source: "server",
          // Use descending index to preserve order from backend
          _receivedAt: now - index,
        });
      });

      // Then, add realtime notifications that are NOT in server data
      // (these are truly new notifications that haven't been persisted yet)
      // They get higher timestamps so they appear first
      let realtimeOffset = 1;
      state.notifications.forEach((notification, id) => {
        if (!serverIdSet.has(id) && notification._source === "realtime") {
          newMap.set(id, {
            ...notification,
            _receivedAt: now + realtimeOffset,
          });
          realtimeOffset++;
        }
      });

      return {
        ...state,
        notifications: newMap,
        lastServerSync: now,
        isInitialized: true,
      };
    }

    case "SET_CONNECTED": {
      return { ...state, connected: action.payload };
    }

    case "SET_INITIALIZED": {
      return { ...state, isInitialized: action.payload };
    }

    case "CLEAR_ALL": {
      return {
        ...state,
        notifications: new Map(),
        isInitialized: false,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// INITIAL STATE
// ============================================================================
const initialState: NotificationState = {
  notifications: new Map(),
  connected: false,
  isInitialized: false,
  lastServerSync: 0,
};

// ============================================================================
// CONTEXT
// ============================================================================
const NotificationsContext = createContext<NotificationsContextType>(
  {} as NotificationsContextType,
);

// ============================================================================
// PROVIDER
// ============================================================================
const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Use refs to avoid stale closure issues in socket handlers
  const stateRef = useRef(state);
  stateRef.current = state;

  const socketInitialized = useRef<boolean>(false);
  const processedIds = useRef<Set<string>>(new Set());

  const pendingToasts = useRef(new Set<string>());
  const toastTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  // WhatsApp event dispatcher (unchanged)
  const whatsAppEventDispatcher = useRef<{
    [key: string]: ((data: any) => void)[];
  }>({});

  // ============================================================================
  // DERIVED STATE (computed from Map)
  // ============================================================================
  const notifications = useMemo(() => {
    // Sort by _receivedAt descending (highest = newest)
    // Realtime notifications have higher timestamps than server notifications
    return Array.from(state.notifications.values()).sort((a, b) => {
      const timeA = a._receivedAt || 0;
      const timeB = b._receivedAt || 0;

      return timeB - timeA;
    });
  }, [state.notifications]);

  // CRITICAL: unreadCount is ALWAYS derived, never stored
  const unreadCount = useMemo(() => {
    return Array.from(state.notifications.values()).filter((n) => !n.read)
      .length;
  }, [state.notifications]);

  // ============================================================================
  // TOAST HANDLING
  // ============================================================================
  const showToastSafely = useCallback((notification: Notification) => {
    const notificationId = notification.id;

    // Clear existing timeout
    const existingTimeout = toastTimeouts.current.get(notificationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      toastTimeouts.current.delete(notificationId);
    }

    pendingToasts.current.add(notificationId);

    const timeoutId = setTimeout(() => {
      if (pendingToasts.current.has(notificationId)) {
        toast.message("", {
          closeButton: true,
          action: (
            <div>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
          ),
        });

        try {
          const audio = new Audio("/sounds/notification.aac");
          audio.play().catch(() => {});
        } catch {}

        pendingToasts.current.delete(notificationId);
        toastTimeouts.current.delete(notificationId);
      }
    }, 100);

    toastTimeouts.current.set(notificationId, timeoutId);
  }, []);

  const cancelPendingToast = useCallback((notificationId: string) => {
    const timeoutId = toastTimeouts.current.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      toastTimeouts.current.delete(notificationId);
    }

    pendingToasts.current.delete(notificationId);
  }, []);

  // ============================================================================
  // WHATSAPP HANDLING
  // ============================================================================
  const handleWhatsAppNotification = useCallback((notification: any) => {
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

    if (toastData.type === "success") {
      toast.success(toastData.message, { id: `whatsapp-${eventType}` });
    } else if (toastData.type === "warning") {
      toast.warning(toastData.message, { id: `whatsapp-${eventType}` });
    } else {
      toast.info(toastData.message, { id: `whatsapp-${eventType}` });
    }
  }, []);

  const subscribeToWhatsAppEvents = useCallback(
    (eventType: string, callback: (data: any) => void) => {
      if (!whatsAppEventDispatcher.current[eventType]) {
        whatsAppEventDispatcher.current[eventType] = [];
      }

      whatsAppEventDispatcher.current[eventType].push(callback);

      return () => {
        if (whatsAppEventDispatcher.current[eventType]) {
          whatsAppEventDispatcher.current[eventType] =
            whatsAppEventDispatcher.current[eventType].filter(
              (cb) => cb !== callback,
            );
        }
      };
    },
    [],
  );

  // ============================================================================
  // FORMAT NOTIFICATION DATE
  // ============================================================================
  const formatNotificationForDisplay = useCallback(
    (notification: Notification): Notification => {
      try {
        let date: Date;

        if (typeof notification.created_at === "string") {
          if (
            notification.created_at.includes("T") ||
            notification.created_at.includes("-")
          ) {
            date = new Date(notification.created_at);
          } else {
            return notification;
          }
        } else {
          date =
            notification.created_at instanceof Date
              ? notification.created_at
              : new Date(notification.created_at);
        }

        if (isNaN(date.getTime())) {
          return {
            ...notification,
            created_at: formatNotificationDate(new Date()),
          };
        }

        return {
          ...notification,
          created_at: formatNotificationDate(date),
        };
      } catch {
        return {
          ...notification,
          created_at: formatNotificationDate(new Date()),
        };
      }
    },
    [],
  );

  // ============================================================================
  // SOCKET INITIALIZATION
  // ============================================================================
  useEffect(() => {
    if (socketInitialized.current) return;

    const setupSocketListeners = async () => {
      try {
        await initializeSocket();
        const socket = getSocket();

        if (!socket) {
          toast.error(
            "Houve um erro ao se conectar ao serviço de notificações!",
            { duration: 5000, id: "socket-init-error" },
          );

          throw new Error("Falha ao inicializar o socket");
        }

        socketInitialized.current = true;
        dispatch({ type: "SET_CONNECTED", payload: socket.connected });

        socket.on("connect", () => {
          dispatch({ type: "SET_CONNECTED", payload: true });
        });

        socket.on("disconnect", () => {
          dispatch({ type: "SET_CONNECTED", payload: false });
        });

        socket.on("pushNotification", (notification: Notification) => {
          // WhatsApp handling
          if (notification.type?.startsWith("whatsapp_")) {
            handleWhatsAppNotification(notification);
            return;
          }

          // IDEMPOTENCY: Skip if already processed
          if (processedIds.current.has(notification.id)) {
            return;
          }

          // CRITICAL: Use stateRef to get current state (avoid stale closure)
          if (stateRef.current.notifications.has(notification.id)) {
            return;
          }

          processedIds.current.add(notification.id);

          const formattedNotification = formatNotificationForDisplay({
            ...notification,
            _source: "realtime",
            _receivedAt: Date.now(),
          });

          dispatch({
            type: "ADD_OR_UPDATE",
            payload: formattedNotification,
          });

          showToastSafely(notification);

          // Browser notification
          if (Notification.permission === "granted") {
            new Notification(notification.title, {
              body: notification.message,
              icon: "/favicon.ico",
            });
          }
        });

        // Security event listener — handle access revocation, permission changes, etc.
        socket.on("securityAction", (event: { reason: string }) => {
          if (event.reason === "access_revoked") {
            disconnectSocket();

            sessionStorage.setItem("pending_login_toast", "true");
            window.location.href =
              "/login?error=user_revoked&force_logout=true";

            return;
          }

          if (event.reason === "access_denied") {
            disconnectSocket();

            sessionStorage.setItem("pending_login_toast", "true");
            window.location.href =
              "/login?error=access_denied&force_logout=true";

            return;
          }

          if (event.reason === "user_updated") {
            disconnectSocket();

            sessionStorage.setItem("pending_login_toast", "true");
            window.location.href =
              "/login?error=session_expired&force_logout=true";

            return;
          }

          // For all other security events, dispatch a DOM event
          // so useNavigationSecurityCheck can run the /user/me check
          window.dispatchEvent(new CustomEvent("security-check-required"));
        });

        // AI Verification event listener — real-time verification progress
        socket.on("aiVerification", (event: any) => {
          const store = useAIVerificationStore.getState();
          store.updateVerification(event);

          // Update business usage when the backend sends it
          if (event.usage && event.businessId) {
            store.updateBusinessUsage(event.businessId, event.usage);
          }

          if (event.step === "completed") {
            const status = event.overallStatus;

            if (status === "error") {
              toast.error("Erro na verificação IA", {
                id: `ai-${event.recordId}`,
              });
            } else if (status === "skipped") {
              toast.warning("Verificação IA não realizada (limite atingido)", {
                id: `ai-${event.recordId}`,
              });
            } else if (status === "mismatch" || status === "issues_found") {
              toast.warning("Verificação IA concluída com divergências", {
                id: `ai-${event.recordId}`,
              });
            } else if (status === "fraud") {
              toast.error("Verificação IA: suspeita de fraude detectada", {
                id: `ai-${event.recordId}`,
              });
            } else {
              toast.success("Verificação IA concluída", {
                id: `ai-${event.recordId}`,
              });
            }
          } else if (event.step === "skipped") {
            toast.warning(event.message || "Verificação IA não realizada", {
              id: `ai-${event.recordId}`,
            });
          } else if (event.step === "queued") {
            toast("Verificação IA iniciada...", {
              id: `ai-${event.recordId}`,
            });
          }
        });

        // On reconnect, trigger a security check to catch events missed during disconnection
        socket.io.on("reconnect", () => {
          dispatch({ type: "SET_CONNECTED", payload: true });
          window.dispatchEvent(new CustomEvent("security-check-required"));
        });

        if (
          Notification.permission !== "denied" &&
          Notification.permission !== "granted"
        ) {
          Notification.requestPermission();
        }
      } catch {
        toast.error("Não foi possível se conectar ao serviço de notificações", {
          duration: 5000,
          id: "socket-init-error",
        });
      }
    };

    setupSocketListeners();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off("pushNotification");
        socket.off("securityAction");

        socket.off("aiVerification");

        socket.off("connect");
        socket.off("disconnect");

        socket.io.off("reconnect");
        socketInitialized.current = false;
      }
    };
    // CRITICAL: Only run once on mount - no dependencies that change
    // We use stateRef to access current state without creating new closures
  }, [
    formatNotificationForDisplay,
    handleWhatsAppNotification,
    showToastSafely,
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));

      toastTimeouts.current.clear();
      pendingToasts.current.clear();
    };
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  const addNotification = useCallback(
    (notification: Notification) => {
      const formattedNotification = formatNotificationForDisplay({
        ...notification,
        _source: "realtime",
        _receivedAt: Date.now(),
      });

      dispatch({ type: "ADD_OR_UPDATE", payload: formattedNotification });
    },
    [formatNotificationForDisplay],
  );

  const removeNotification = useCallback((notificationId: string) => {
    dispatch({ type: "DELETE", payload: notificationId });
    processedIds.current.delete(notificationId);
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    dispatch({ type: "MARK_READ", payload: notificationId });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
    processedIds.current.clear();
  }, []);

  const syncWithServerData = useCallback(
    (serverNotifications: Notification[], serverIds: string[]) => {
      // Cancel pending toasts for notifications now in server data
      serverIds.forEach((id) => cancelPendingToast(id));

      // Add server IDs to processed set to prevent duplicate toasts
      serverIds.forEach((id) => processedIds.current.add(id));

      const formattedNotifications = serverNotifications.map((n) =>
        formatNotificationForDisplay({ ...n, _source: "server" }),
      );

      dispatch({
        type: "SYNC_WITH_SERVER",
        payload: {
          serverNotifications: formattedNotifications,
          serverIds,
        },
      });
    },
    [cancelPendingToast, formatNotificationForDisplay],
  );

  const replaceAllNotifications = useCallback(
    (newNotifications: Notification[]) => {
      const formattedNotifications = newNotifications.map((n) =>
        formatNotificationForDisplay({ ...n, _source: "server" }),
      );
      dispatch({ type: "REPLACE_ALL", payload: formattedNotifications });

      // Update processed IDs - clear old ones and add new ones
      processedIds.current.clear();
      newNotifications.forEach((n) => processedIds.current.add(n.id));
    },
    [formatNotificationForDisplay],
  );

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const contextValue: NotificationsContextType = {
    // Derived state
    notifications,
    unreadCount,
    connected: state.connected,
    isInitialized: state.isInitialized,

    // Actions
    addNotification,
    removeNotification,
    markNotificationAsRead,
    clearNotifications,
    syncWithServerData,
    replaceAllNotifications,

    // WhatsApp
    subscribeToWhatsAppEvents,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

const useNotificationsContext = () => useContext(NotificationsContext);
export { NotificationsProvider, useNotificationsContext };
