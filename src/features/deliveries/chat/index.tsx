"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";

import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSocket, initializeSocket } from "@/socket";

import { useAuthStore } from "@/store/auth-store";

import { listChatThreads } from "@/actions/chat/list-chat-threads";
import { searchChatMessages } from "@/actions/chat/search-chat-messages";

import type {
  ChatThreadEntry,
  SentChatMessage,
} from "@/actions/chat/chat.types";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { ThreadList } from "./thread-list";
import { Conversation } from "./conversation";

import { useChatSubscription } from "./lib/use-chat-socket";
import { THREADS_REFRESH_COALESCE_MS } from "./lib/use-chat-unread";

import { useDriverHints } from "./lib/use-driver-hints";
import { chatHintVisibleMs } from "./lib/chat-hints";

import type {
  ChatDeliveryChip,
  ChatFocusRequest,
  ChatTarget,
} from "./lib/types";

interface ChatPanelProps {
  /** Set only in admin mode: the MASTER's chosen company. */
  businessId?: string;
}

/**
 * The SAC side of the driver chat: conversations on the left, the open one
 * on the right, everything live over the socket the app already keeps.
 * Below `lg` the two panes become two screens with a back button — the
 * messenger pattern every phone user already knows.
 */
const ChatPanel = ({ businessId }: ChatPanelProps): JSX.Element => {
  const queryClient = useQueryClient();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const myUserId = useAuthStore((state) => state.id);
  const role = useAuthStore((state) => state.role);

  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  // Support reads every company's chat and writes in none: a message sent
  // from here would reach the driver looking like it came from his own
  // central. The API refuses it, so the panel never offers it.
  const isSupportReadOnly = role === "MASTER";

  const canWrite = writePermission.hasAllPermissions && !isSupportReadOnly;

  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [target, setTarget] = useState<ChatTarget | null>(null);
  const [initialChip, setInitialChip] = useState<ChatDeliveryChip | null>(null);

  /**
   * Which message the open conversation has to land on, if any.
   *
   * Held here rather than inside the conversation because it is the LIST
   * that knows a hit was clicked. The token is what tells two clicks apart:
   * a second hit in the conversation already open changes nothing else about
   * the pane, and without it the reader would be left where the first one
   * put them.
   */
  const [focusRequest, setFocusRequest] = useState<ChatFocusRequest | null>(
    null,
  );

  const focusTokenRef = useRef<number>(0);

  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

  /**
   * What the other side is doing right now, per driver.
   *
   * Two registries and not one with a shape inside it, because the two
   * hints are two events on the wire — they can be true at the same instant
   * and neither may erase the other. Both are pulses and both are put out
   * by silence; only the window differs, and the bookkeeping behind them is
   * the same hook.
   */
  const { active: typingDrivers, mark: markTyping } = useDriverHints(
    chatHintVisibleMs("typing"),
  );

  const { active: recordingDrivers, mark: markRecording } = useDriverHints(
    chatHintVisibleMs("recording"),
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Admin mode only: the master is not in any company room by birth, and
  // asks to join the one it is looking at.
  useChatSubscription(businessId);

  // ============================================================= queries
  const threadsQuery = useQuery(
    ["chat-threads", businessId ?? "session", debouncedSearch],
    async () => {
      const result = await listChatThreads({
        businessId,
        search: debouncedSearch,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message);
      }

      return result.data;
    },
    { refetchOnWindowFocus: true, keepPreviousData: true },
  );

  const threads = useMemo(
    () => threadsQuery.data?.data ?? [],
    [threadsQuery.data],
  );

  /** Two characters is where a text search starts being worth a request. */
  const isSearchingMessages = debouncedSearch.trim().length >= 2;

  const hitsQuery = useQuery(
    ["chat-search", businessId ?? "session", debouncedSearch],
    async () => {
      const result = await searchChatMessages({
        businessId,
        search: debouncedSearch,
      });

      return result.success && result.data ? result.data.data : [];
    },
    {
      enabled: isSearchingMessages,

      /**
       * Tied to `enabled`, and that is the whole bug fix.
       *
       * The query client turns `keepPreviousData` on for every query in the
       * app. Clearing the field does change this key — so the new key has no
       * data — but the new key is also DISABLED, so it never fetches, and
       * react-query hands a disabled query the previous key's data forever
       * (`queryObserver`: keepPreviousData && !dataUpdateCount && previous
       * was a success). The "Mensagens" section therefore kept listing hits
       * for a search that no longer existed, and only picking another
       * conversation ever cleared it.
       *
       * Off while there is no search, so an empty field means an empty
       * section; on between two real searches, which is the transition the
       * flag exists for — the list does not blink white on every keystroke.
       */
      keepPreviousData: isSearchingMessages,
    },
  );

  // ======================================================= URL preselect
  // "Conversar com o motorista" in the delivery detail lands here with the
  // driver and the delivery in the URL; consumed once and cleaned away.
  useEffect(() => {
    const driverId = searchParams.get("chatDriver");

    if (!driverId) return;

    const driverName = searchParams.get("chatDriverName") ?? "Motorista";
    const deliveryId = searchParams.get("chatDelivery");
    const recipient = searchParams.get("chatRecipient");

    setTarget({
      driverId,
      driverName,
      threadId: null,
      driverUser: null,
    });

    setInitialChip(
      deliveryId && recipient
        ? { id: deliveryId, recipient_name: recipient }
        : null,
    );

    setFocusRequest(null);
    setMobileView("conversation");

    const cleaned = new URLSearchParams(searchParams.toString());

    ["chatDriver", "chatDriverName", "chatDelivery", "chatRecipient"].forEach(
      (key) => cleaned.delete(key),
    );

    router.replace(`${pathname}?${cleaned.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A target chosen before the list loaded (URL, new conversation) gets its
  // thread and presence stitched in as soon as the entries arrive.
  //
  // A shortcut, and only that: the entry may never arrive — the list is
  // paginated and filtered by the search box — and the conversation resolves
  // its own thread and its own driverUser from the API regardless.
  useEffect(() => {
    if (!target) return;

    const entry = threads.find(
      (thread) => thread.driver.id === target.driverId,
    );

    if (!entry) return;

    setTarget((current) =>
      current && current.driverId === entry.driver.id
        ? {
            ...current,
            threadId: entry.id,
            driverName: entry.driver.name,
            cnh: entry.driver.cnh,
            driverUser: entry.driverUser,
          }
        : current,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);

  // ============================================================ realtime
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Previews, ordering and badges all derive from one indexed query, so
  // refetching it is always correct. Events arrive in bursts, though — a
  // broadcast reply, a fleet coming online after a deploy — and one refetch
  // each would hammer the API for a single visible change.
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
    let disposed = false;

    const handleChatMessage = () => {
      if (disposed) return;

      scheduleThreadsRefresh();
    };

    const handleChatPresence = () => {
      if (disposed) return;

      scheduleThreadsRefresh();
    };

    const handleChatTyping = (payload?: { driverId?: string }) => {
      if (disposed || !payload?.driverId) return;

      // No "stopped typing" exists on the wire: the hint is re-sent while
      // the keyboard is busy and the window is what ends it.
      markTyping(payload.driverId, true);
    };

    /**
     * The recording hint, which pulses the same way and MAY also say when
     * it ends.
     *
     * `recording` is read as "anything but an explicit false is a pulse",
     * matching the server. The `false` is a courtesy that makes a clean
     * ending instant instead of four seconds late; nothing depends on it.
     *
     * What the window does NOT rescue any more is a client that announces
     * the start once and never pulses — an app whose bundle has not been
     * relaunched yet. It used to be carried by a window as long as a whole
     * recording; against four seconds its hint now dies mid-sentence, so
     * that driver simply shows no hint rather than a stale one. That is the
     * right side to fail on, and it is temporary: the pulse ships with the
     * next relaunch.
     */
    const handleChatRecording = (payload?: {
      driverId?: string;
      recording?: boolean;
    }) => {
      if (disposed || !payload?.driverId) return;

      markRecording(payload.driverId, payload.recording !== false);
    };

    let boundSocket: ReturnType<typeof getSocket> = null;

    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        boundSocket = socket;

        socket.on("chatMessage", handleChatMessage);
        socket.on("chatPresence", handleChatPresence);
        socket.on("chatTyping", handleChatTyping);
        socket.on("chatRecording", handleChatRecording);
      })
      .catch(() => {
        // Without realtime the refresh button still refetches everything.
      });

    return () => {
      disposed = true;

      boundSocket?.off("chatMessage", handleChatMessage);
      boundSocket?.off("chatPresence", handleChatPresence);
      boundSocket?.off("chatTyping", handleChatTyping);
      boundSocket?.off("chatRecording", handleChatRecording);

      // The timers belong to the hooks above and are cleared with them.
    };
  }, [markRecording, markTyping, scheduleThreadsRefresh]);

  // =========================================================== selection
  const handleSelectThread = (entry: ChatThreadEntry) => {
    setTarget({
      driverId: entry.driver.id,
      driverName: entry.driver.name,
      cnh: entry.driver.cnh,
      threadId: entry.id,
      driverUser: entry.driverUser,
    });

    setInitialChip(null);

    // Picking a conversation is asking for the conversation, not for
    // wherever a previous search hit had parked it.
    setFocusRequest(null);

    setMobileView("conversation");
  };

  const handleSelectDriver = (driver: {
    id: string;
    name: string;
    cnh?: string;
  }) => {
    // Searching by message text matches no driver by name, so this lookup
    // misses exactly when a history exists — which is fine: the pane opens
    // on the driver and the API hands it the thread.
    const existing = threads.find((entry) => entry.driver.id === driver.id);

    if (existing) {
      handleSelectThread(existing);
      return;
    }

    setTarget({
      driverId: driver.id,
      driverName: driver.name,
      cnh: driver.cnh,
      threadId: null,
      driverUser: null,
    });

    setInitialChip(null);
    setFocusRequest(null);

    setMobileView("conversation");
  };

  /**
   * A hit opens the conversation ON the message, not at the end of it.
   *
   * The focus is set AFTER the driver, on purpose: opening the driver is
   * what clears any focus left over from a previous hit, and the two land in
   * the same commit, so this write is the one that survives.
   */
  const handleSelectHit = (hit: SentChatMessage) => {
    handleSelectDriver({ id: hit.driver.id, name: hit.driver.name });

    focusTokenRef.current += 1;

    setFocusRequest({ messageId: hit.id, token: focusTokenRef.current });
  };

  const handleThreadResolved = useCallback(
    (driverId: string, threadId: string) => {
      setTarget((current) =>
        current && current.driverId === driverId && !current.threadId
          ? { ...current, threadId }
          : current,
      );

      queryClient.invalidateQueries(["chat-threads"]);
    },
    [queryClient],
  );

  // Presence for the open conversation always reads the freshest entry.
  const selectedEntry = target
    ? threads.find((entry) => entry.driver.id === target.driverId)
    : undefined;

  const presence = selectedEntry?.driverUser
    ? {
        online: selectedEntry.driverUser.online,
        lastSeenAt: selectedEntry.driverUser.last_seen_at,
      }
    : null;

  return (
    <div
      className="flex h-[calc(100dvh-270px)] min-h-[460px] overflow-hidden
      rounded-lg border bg-card"
      data-tutorial="chat-panel"
    >
      <aside
        className={cn(
          "w-full flex-col lg:flex lg:w-80 lg:shrink-0 lg:border-r",
          mobileView === "list" ? "flex" : "hidden",
        )}
      >
        <ThreadList
          threads={threads}
          totalUnread={threadsQuery.data?.totalUnread ?? 0}
          isLoading={threadsQuery.isLoading}
          errorMessage={
            threadsQuery.isError
              ? (threadsQuery.error as Error).message
              : ""
          }
          onRetry={() => threadsQuery.refetch()}
          selectedDriverId={target?.driverId ?? null}
          onSelectThread={handleSelectThread}
          onSelectDriver={handleSelectDriver}
          search={search}
          onSearchChange={setSearch}
          messageHits={hitsQuery.data ?? []}
          onSelectHit={handleSelectHit}
          typingDrivers={typingDrivers}
          recordingDrivers={recordingDrivers}
          canWrite={canWrite}
          isReadOnly={isSupportReadOnly}
          actionBusinessId={businessId}
          onBroadcastSent={() =>
            queryClient.invalidateQueries(["chat-threads"])
          }
          myUserId={myUserId}
        />
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col lg:flex",
          mobileView === "conversation" ? "flex" : "hidden",
        )}
      >
        {target ? (
          <Conversation
            key={target.driverId}
            actionBusinessId={businessId}
            target={target}
            presence={presence}
            isDriverTyping={Boolean(typingDrivers[target.driverId])}
            isDriverRecording={Boolean(recordingDrivers[target.driverId])}
            myUserId={myUserId}
            canWrite={canWrite}
            isReadOnly={isSupportReadOnly}
            initialDeliveryChip={initialChip}
            focusRequest={focusRequest}
            onBack={() => setMobileView("list")}
            onThreadResolved={handleThreadResolved}
          />
        ) : (
          <div
            className="hidden h-full flex-col items-center justify-center
            gap-3 lg:flex"
          >
            <div
              className="flex h-16 w-16 items-center justify-center
              rounded-full bg-muted"
            >
              <MessageCircle className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium">Chat com os motoristas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSupportReadOnly
                  ? "Selecione uma conversa ao lado para acompanhar o histórico."
                  : "Selecione uma conversa ao lado — ou comece uma nova pelo botão no topo da lista."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export { ChatPanel };
