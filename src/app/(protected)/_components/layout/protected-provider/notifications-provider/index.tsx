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
import { fetchNotificationStream } from "@/lib/notification-stream";
import { initializeSocket, getSocket, onRealtimeResync } from "@/socket";

import { forceLogout } from "@/lib/force-logout";
import { isSessionExiting, leaveSession } from "@/lib/clear-session-state";
import {
  SESSION_LOGOUT_DESTINATION,
  isSessionLogoutEvent,
  socketLogoutReason,
} from "./socket-logout-reason";
import { useAIVerificationStore } from "@/store/ai-verification-store";
import { queryClientProps } from "@/lib/query-client-props";
import {
  AI_ANALYSIS_CHANGED_EVENT,
  applyAIAnalysisChange,
  isAIAnalysisChangedEvent,
} from "@/lib/ai-analysis-sync";

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
  | { type: "MARK_ALL_READ" }
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
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  syncWithServerData: (
    serverNotifications: Notification[],
    serverIds: string[],
  ) => void;
  replaceAllNotifications: (notifications: Notification[]) => void;
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

    case "MARK_ALL_READ": {
      const newMap = new Map(state.notifications);

      newMap.forEach((notification, id) => {
        if (!notification.read) {
          newMap.set(id, { ...notification, read: true });
        }
      });

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
/** The size the layout loads (fetch-notifications.ts), so a resync matches it. */
const RESYNC_NOTIFICATIONS_LIMIT = 50;

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

    // What the `.catch` below used to show when initializeSocket rejected on
    // a first failed handshake. The socket is now handed over before it
    // connects, so that failure arrives as an event: said once, while the
    // retry keeps going behind it, and never for a drop after a connection
    // (the reconnection's business, silent as it always was).
    const handleFirstConnectError = () => {
      toast.error("Não foi possível se conectar ao serviço de notificações", {
        duration: 5000,
        id: "socket-init-error",
      });
    };

    // Named, so the cleanup removes these two and nothing else. A bare
    // `off("connect")` also took the socket module's own status listener and
    // the room rejoin of every operations and chat subscription with it.
    const handleConnect = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });

      getSocket()?.off("connect_error", handleFirstConnectError);
    };

    const handleDisconnect = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
    };

    // Named for the same reason: the socket is shared by the whole app, and
    // the cleanup below must remove these handlers and nobody else's.
    const handlePush = (notification: Notification) => {
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
    };

    // Security event listener — handle access revocation, permission changes, etc.
    const handleSecurityAction = (event: { reason: string }) => {
      // `forceLogout` raises the blocking overlay, closes the socket and
      // does the hard navigate — the three used to be spelled out at every
      // one of these branches.
      // The vocabulary lives in socket-logout-reason.ts.
      // This tab already ends the session ("Sair"): nothing left to act on.
      if (isSessionExiting()) return;

      // "Sair" in another tab of this same session (the API emits it to the
      // session's room): leave like that tab did, to the same "você saiu".
      if (isSessionLogoutEvent(event)) {
        sessionStorage.setItem("pending_login_toast", "true");
        leaveSession(SESSION_LOGOUT_DESTINATION);
        return;
      }

      const reason = socketLogoutReason(event?.reason);

      if (reason) {
        forceLogout(reason);
        return;
      }

      // For all other security events, dispatch a DOM event
      // so useNavigationSecurityCheck can run the /user/me check
      window.dispatchEvent(new CustomEvent("security-check-required"));
    };

    // AI Verification event listener — real-time verification progress
    const handleAiVerification = (event: any) => {
      const store = useAIVerificationStore.getState();
      store.updateVerification(event);

      // Update business usage when the backend sends it
      if (event.usage && event.businessId) {
        store.updateBusinessUsage(event.businessId, event.usage);
      }

      // A receipt's reading is the driver's (the app shows it); the web's
      // queue refreshes from the company hint instead of toasting (AI-7).
      if (event.recordType === "proof") return;

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
    };

    // An analysis of the company ended (AI-6): refetch what shows it.
    const handleAiAnalysisChanged = (payload: unknown) => {
      if (!isAIAnalysisChangedEvent(payload)) return;

      void applyAIAnalysisChange(queryClientProps, payload);
    };

    // Hired modules changed — the session stays valid (the API is the
    // enforcement point); the UI just refreshes what it may show.
    const handleEntitlements = (event: {
      module: string;
      enabled: boolean;
    }) => {
      window.dispatchEvent(
        new CustomEvent("entitlements-changed", { detail: event }),
      );

      // Same path a revoked permission takes: re-read /user/me, refresh
      // the menus from the answer and walk the user out of the page if
      // it just stopped being theirs.
      window.dispatchEvent(new CustomEvent("security-check-required"));

      toast.info(
        event.enabled
          ? "Um novo módulo foi habilitado para a sua empresa."
          : "Um módulo foi desabilitado para a sua empresa.",
        { id: `entitlement-${event.module}` },
      );
    };

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

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        if (!socket.connected) {
          socket.once("connect_error", handleFirstConnectError);
        }

        // Bound whether or not the socket is connected yet: they simply wait
        // for it, and a refused first handshake is retried by the socket
        // module. `securityAction` is the forced logout of a blocked user.
        socket.on("pushNotification", handlePush);
        socket.on("securityAction", handleSecurityAction);
        socket.on("aiVerification", handleAiVerification);
        socket.on(AI_ANALYSIS_CHANGED_EVENT, handleAiAnalysisChanged);
        socket.on("entitlementsChanged", handleEntitlements);

        // What a reconnection missed (security events included) is caught up
        // by the `onRealtimeResync` subscription further down.

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
        socket.off("pushNotification", handlePush);
        socket.off("securityAction", handleSecurityAction);

        socket.off("aiVerification", handleAiVerification);
        socket.off(AI_ANALYSIS_CHANGED_EVENT, handleAiAnalysisChanged);
        socket.off("entitlementsChanged", handleEntitlements);

        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("connect_error", handleFirstConnectError);

        socketInitialized.current = false;
      }
    };
    // CRITICAL: Only run once on mount - no dependencies that change
    // We use stateRef to access current state without creating new closures
  }, [formatNotificationForDisplay, showToastSafely]);

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

  const markAllNotificationsAsRead = useCallback(() => {
    dispatch({ type: "MARK_ALL_READ" });
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

  // ============================================================================
  // RECONCILIATION AFTER A RECONNECTION
  // ============================================================================
  /**
   * The API does not replay what it emitted while this tab was reconnecting,
   * and the bell is only fed by the layout — which a client-side navigation
   * does not re-render. A notification pushed during a deploy stayed missing
   * until a reload.
   *
   * So the same list the layout loads is asked again and merged: server rows
   * win (read or deleted elsewhere shows as such), realtime ones the server
   * does not have yet are kept, and the ids go into `processedIds`, so nothing
   * fetched here toasts a second time when its push arrives late.
   *
   * The `/user/me` re-check that used to hang off the manager's `reconnect`
   * lives here too: a revocation emitted while offline is just as lost.
   */
  useEffect(
    () =>
      onRealtimeResync(() => {
        window.dispatchEvent(new CustomEvent("security-check-required"));

        fetchNotificationStream({
          limit: RESYNC_NOTIFICATIONS_LIMIT,
          includeRead: true,
        })
          .then(({ data }: { data: Notification[] }) =>
            syncWithServerData(
              data,
              data.map((notification) => notification.id),
            ),
          )
          .catch(() => {
            // The next navigation or reconnection tries again; a bell one
            // blink behind is not worth an error on screen.
          });
      }),
    [syncWithServerData],
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
    markAllNotificationsAsRead,
    clearNotifications,
    syncWithServerData,
    replaceAllNotifications,
  };

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

const useNotificationsContext = () => useContext(NotificationsContext);

export { NotificationsProvider, useNotificationsContext };
export type { Notification };
