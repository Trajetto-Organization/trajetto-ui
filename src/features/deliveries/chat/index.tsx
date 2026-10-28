"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";

import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AccessError } from "@/lib/access-error";

import { AccessErrorState } from "@/components/shared/custom/access-error-state";
import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";

import { useAuthStore } from "@/store/auth-store";

import { RelayReadError, relayAnswer } from "@/lib/relay-read";

import type { SentChatMessage, TicketSummary } from "@/actions/chat/chat.types";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { Conversation } from "./conversation";
import { TicketList } from "./tickets/ticket-list";
import { TicketHeader } from "./tickets/ticket-header";
import { NewTicketDialog } from "./tickets/new-ticket-dialog";

import { useChatSubscription } from "./lib/use-chat-socket";
import { fetchChatSearch, fetchTicket, fetchTickets } from "./lib/chat-reads";
import {
  THREADS_REFRESH_COALESCE_MS,
  useTicketsSummary,
} from "./lib/use-chat-unread";

import { useDriverHints } from "./lib/use-driver-hints";
import { chatHintVisibleMs } from "./lib/chat-hints";

import { readChatLink, readTicketLink, withoutChatLink } from "./lib/chat-link";
import {
  TICKETS_QUERY_ROOT,
  ticketFilterQuery,
  type TicketFilterKey,
} from "./lib/ticket-rules";
import { setOpenTicketId } from "../ops-alert/open-ticket";

import type {
  ChatFocusRequest,
  ChatHistoryFilter,
  ChatTarget,
} from "./lib/types";

interface ChatPanelProps {
  /** Set only in admin mode: the MASTER's chosen company. */
  businessId?: string;
}

/** A refusal that is about access, carried through react-query. */
class ChatAccessRefusal extends Error {
  constructor(readonly accessError: AccessError) {
    super(accessError.message ?? "Acesso recusado.");
    this.name = "ChatAccessRefusal";
  }
}

const PAGE_SIZE = 30;

/**
 * "Atendimentos" (decision 14.5, design §6.1): every subject with a driver
 * is a ticket — an occurrence's, a delivery's, a route's or a general one.
 * Tickets on the left, the open ticket's conversation on the right (the
 * driver's thread narrowed to that ticket), with who handles it, the
 * decision when an authorization waits, and the trail. Below `lg` the two
 * panes become two screens with a back button.
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

  // Support reads every company's tickets and writes in none.
  const isSupportReadOnly = role === "MASTER";
  const canWrite = writePermission.hasAllPermissions && !isSupportReadOnly;

  const [filter, setFilter] = useState<TicketFilterKey>("OPEN");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [pages, setPages] = useState<number>(1);

  const [ticket, setTicket] = useState<TicketSummary | null>(null);

  /** The driver's whole conversation instead of one ticket (read-only). */
  const [wholeConversation, setWholeConversation] = useState<ChatTarget | null>(
    null,
  );
  const [focusRequest, setFocusRequest] = useState<ChatFocusRequest | null>(
    null,
  );
  const focusTokenRef = useRef<number>(0);

  const [newTicketDriver, setNewTicketDriver] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

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

  // A new filter or search starts from the first page.
  useEffect(() => setPages(1), [filter, debouncedSearch]);

  // The balloon must not pop a card for the ticket on screen.
  useEffect(() => {
    setOpenTicketId(wholeConversation ? null : (ticket?.id ?? null));

    return () => setOpenTicketId(null);
  }, [ticket?.id, wholeConversation]);

  // Admin mode only: the master asks to join the company it is looking at.
  useChatSubscription(businessId);

  const summary = useTicketsSummary();

  // ============================================================= queries
  const ticketsQuery = useQuery(
    [
      TICKETS_QUERY_ROOT,
      "list",
      businessId ?? "session",
      filter,
      debouncedSearch,
      pages,
    ],
    // Relay GETs (lib/chat-reads), so the list, the search and the badge's
    // counts leave together instead of one after the other in Next's
    // Server Action queue. The client's retry policy leaves a refusal alone
    // (an access refusal included) and tries a transient failure once.
    async ({ signal }) => {
      try {
        return await fetchTickets(
          {
            businessId,
            ...ticketFilterQuery(filter),
            search: debouncedSearch,
            page: 1,
            pageSize: PAGE_SIZE * pages,
          },
          { signal },
        );
      } catch (error) {
        if (error instanceof RelayReadError && error.accessError) {
          throw new ChatAccessRefusal(error.accessError);
        }

        throw error;
      }
    },
    {
      refetchOnWindowFocus: true,
      // Pages and filters of one company: the panel is remounted per
      // company (key={businessId}), so the rows held are never another's.
      keepPreviousData: true,
    },
  );

  const accessRefusal =
    ticketsQuery.error instanceof ChatAccessRefusal
      ? ticketsQuery.error.accessError
      : null;

  const tickets = useMemo(
    () => ticketsQuery.data?.data ?? [],
    [ticketsQuery.data],
  );
  const counts = ticketsQuery.data?.counts ?? summary;

  // The list is the freshest copy of the open ticket (version-ordered).
  useEffect(() => {
    if (!ticket) return;

    const fresh = tickets.find((entry) => entry.id === ticket.id);

    if (fresh && fresh.version > ticket.version) setTicket(fresh);
  }, [tickets, ticket]);

  const isSearchingMessages = debouncedSearch.trim().length >= 2;

  const hitsQuery = useQuery(
    ["chat-search", businessId ?? "session", debouncedSearch],
    // A failed search shows no hits rather than an error.
    ({ signal }) =>
      fetchChatSearch(
        { businessId, search: debouncedSearch },
        { signal },
      ).catch(() => []),
    { enabled: isSearchingMessages, keepPreviousData: isSearchingMessages },
  );

  // ======================================================== deep links
  // "Ver conversa" (occurrences, balloon, delivery detail) lands with
  // `ticket`; the older links (driver, delivery, route) open that context's
  // open ticket, or the driver's whole conversation when there is none.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const ticketId = readTicketLink(params);
    const link = readChatLink(params);

    if (!ticketId && !link) return;

    const cleaned = withoutChatLink(params);
    router.replace(`${pathname}?${cleaned.toString()}`);

    void (async () => {
      if (ticketId) {
        const result = await relayAnswer(
          fetchTicket({ ticketId, businessId }),
          "Houve um erro ao carregar o atendimento.",
        );

        if (result.success && result.data) {
          openTicket(result.data);
        } else {
          toast.error(result.message);
        }

        return;
      }

      if (!link) return;

      const contextFilter: ChatHistoryFilter | null = link.filter;
      setTicket(null);

      const found = await relayAnswer(
        fetchTickets({
          businessId,
          status: "OPEN",
          driverId: link.driverId,
          ...(contextFilter?.kind === "delivery" ||
          (!contextFilter && link.chip)
            ? { deliveryId: contextFilter?.id ?? link.chip?.id }
            : {}),
          ...(contextFilter?.kind === "route"
            ? { routeId: contextFilter.id }
            : {}),
          pageSize: 1,
        }),
        "Houve um erro ao carregar os atendimentos.",
      );

      const first = found.success ? found.data?.data[0] : undefined;

      if (first) {
        openTicket(first);
        return;
      }

      openWholeConversation({
        driverId: link.driverId,
        driverName: link.driverName,
        threadId: null,
        driverUser: null,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================ realtime
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;

    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);
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

    const handleRefresh = () => {
      if (!disposed) scheduleRefresh();
    };

    const handleChatTyping = (payload?: { driverId?: string }) => {
      if (disposed || !payload?.driverId) return;

      markTyping(payload.driverId, true);
    };

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

        socket.on("chatMessage", handleRefresh);
        socket.on("supportTicket", handleRefresh);
        socket.on("chatTyping", handleChatTyping);
        socket.on("chatRecording", handleChatRecording);
      })
      .catch(() => {
        // Without realtime "Atualizar" still refetches everything.
      });

    // What arrived while the socket was down is never re-emitted.
    const stopResync = onRealtimeResync(scheduleRefresh);

    return () => {
      disposed = true;
      stopResync();

      boundSocket?.off("chatMessage", handleRefresh);
      boundSocket?.off("supportTicket", handleRefresh);
      boundSocket?.off("chatTyping", handleChatTyping);
      boundSocket?.off("chatRecording", handleChatRecording);
    };
  }, [markRecording, markTyping, scheduleRefresh]);

  // =========================================================== selection
  function openTicket(next: TicketSummary) {
    setTicket(next);
    setWholeConversation(null);
    setFocusRequest(null);
    setMobileView("conversation");
  }

  /** The ticket stays selected: "Voltar ao atendimento" returns to it. */
  function openWholeConversation(target: ChatTarget) {
    setWholeConversation(target);
    setMobileView("conversation");
  }

  const handleSelectHit = (hit: SentChatMessage) => {
    setTicket(null);
    openWholeConversation({
      driverId: hit.driver.id,
      driverName: hit.driver.name,
      threadId: hit.threadId,
      driverUser: null,
    });

    focusTokenRef.current += 1;
    setFocusRequest({ messageId: hit.id, token: focusTokenRef.current });
  };

  if (accessRefusal) {
    return (
      <div
        className="flex min-h-[460px] items-center justify-center rounded-lg border bg-card p-6"
        data-tutorial="chat-panel"
      >
        <AccessErrorState
          kind={accessRefusal.kind}
          message={accessRefusal.message}
          audience={businessId ? "master" : "company"}
        />
      </div>
    );
  }

  const conversationTarget: ChatTarget | null = wholeConversation
    ? wholeConversation
    : ticket
      ? {
          driverId: ticket.driver.id,
          driverName: ticket.driver.name,
          threadId: ticket.threadId,
          driverUser: null,
        }
      : null;

  const historyFilter: ChatHistoryFilter | null =
    ticket && !wholeConversation
      ? { kind: "ticket", id: ticket.id, label: `#${ticket.number}` }
      : null;

  return (
    <div
      className={cn(
        "flex min-h-[460px] overflow-hidden rounded-lg border bg-card",
        /*
          The two panes fill what the Torre leaves under its header, so the
          composer sits at the bottom of the screen instead of below the
          fold. The 270px was Entregas' tab; the Torre adds its cadence row.
          On a desk, from the top: the app header (56) + its padding (24) +
          the page container (16) + the heading (56) + the shell's margin
          (24) + the toolbar (selector or actions 40, gap 12, views 40) + 24
          + the cadence row (32) + 24 = 348, and 40 under it (the shell's
          margin and the container's padding).
        */
        "h-[calc(100dvh-388px)]",
        /*
          Full screen: only the Torre, pinned with 16px around it — 16 +
          the toolbar (92) + 24 + the cadence row (32) + 24 above, 16 below.
        */
        "[[data-fullscreen]_&]:h-[calc(100dvh-204px)]",
      )}
      data-tutorial="chat-panel"
    >
      <aside
        className={cn(
          "w-full flex-col lg:flex lg:w-96 lg:shrink-0 lg:border-r",
          mobileView === "list" ? "flex" : "hidden",
        )}
      >
        <TicketList
          tickets={tickets}
          counts={counts ?? null}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          isLoading={ticketsQuery.isLoading}
          isRefreshing={ticketsQuery.isFetching && !ticketsQuery.isLoading}
          errorMessage={
            ticketsQuery.isError ? (ticketsQuery.error as Error).message : ""
          }
          onRetry={() => ticketsQuery.refetch()}
          onRefresh={() => queryClient.invalidateQueries([TICKETS_QUERY_ROOT])}
          hasMore={tickets.length < (ticketsQuery.data?.total ?? 0)}
          isLoadingMore={ticketsQuery.isFetching && pages > 1}
          onLoadMore={() => setPages((current) => current + 1)}
          selectedTicketId={wholeConversation ? null : (ticket?.id ?? null)}
          onSelectTicket={openTicket}
          onPickDriver={(driver) =>
            setNewTicketDriver({ id: driver.id, name: driver.name })
          }
          messageHits={isSearchingMessages ? (hitsQuery.data ?? []) : []}
          onSelectHit={handleSelectHit}
          canWrite={canWrite}
          isReadOnly={isSupportReadOnly}
          actionBusinessId={businessId}
          onBroadcastSent={() =>
            queryClient.invalidateQueries([TICKETS_QUERY_ROOT])
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
        {conversationTarget ? (
          <>
            {ticket && !wholeConversation && (
              <TicketHeader
                key={ticket.id}
                ticket={ticket}
                actionBusinessId={businessId}
                myUserId={myUserId}
                isReadOnly={isSupportReadOnly}
                onBack={() => setMobileView("list")}
                onShowWholeConversation={() =>
                  openWholeConversation(conversationTarget)
                }
                onChanged={setTicket}
              />
            )}

            {wholeConversation && (
              <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2 text-xs">
                <span>
                  Conversa completa com {wholeConversation.driverName} (somente
                  leitura)
                </span>
                <button
                  type="button"
                  className="shrink-0 underline"
                  onClick={() =>
                    ticket ? setWholeConversation(null) : setMobileView("list")
                  }
                >
                  {ticket
                    ? `Voltar ao atendimento #${ticket.number}`
                    : "Voltar"}
                </button>
              </div>
            )}

            <Conversation
              key={`${conversationTarget.driverId}:${historyFilter?.id ?? "all"}`}
              actionBusinessId={businessId}
              target={conversationTarget}
              presence={null}
              isDriverTyping={Boolean(
                typingDrivers[conversationTarget.driverId],
              )}
              isDriverRecording={Boolean(
                recordingDrivers[conversationTarget.driverId],
              )}
              myUserId={myUserId}
              // A closed ticket and the whole conversation are read here;
              // writing happens inside an open ticket.
              canWrite={
                canWrite &&
                Boolean(ticket) &&
                !wholeConversation &&
                ticket?.status === "OPEN"
              }
              isReadOnly={isSupportReadOnly}
              initialDeliveryChip={null}
              historyFilter={historyFilter}
              onHistoryFilterChange={(next) => {
                if (!next) openWholeConversation(conversationTarget);
              }}
              focusRequest={focusRequest}
              onBack={() => setMobileView("list")}
              onThreadResolved={() =>
                queryClient.invalidateQueries([TICKETS_QUERY_ROOT])
              }
            />
          </>
        ) : (
          <div className="hidden h-full flex-col items-center justify-center gap-3 lg:flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <LifeBuoy className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="max-w-xs text-center">
              <p className="text-sm font-medium">Atendimentos</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSupportReadOnly
                  ? "Selecione um atendimento ao lado para acompanhar o histórico."
                  : "Selecione um atendimento ao lado — ou abra um novo pelo botão no topo da lista."}
              </p>
            </div>
          </div>
        )}
      </section>

      {newTicketDriver && (
        <NewTicketDialog
          driver={newTicketDriver}
          actionBusinessId={businessId}
          onOpened={(opened) => {
            setNewTicketDriver(null);
            queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);
            openTicket(opened);
          }}
          onClose={() => setNewTicketDriver(null)}
        />
      )}
    </div>
  );
};

export { ChatPanel };
