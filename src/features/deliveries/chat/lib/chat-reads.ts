import { relayUrl } from "@/lib/api-relay-paths";
import { readQuery, relayJson, relayNdjson } from "@/lib/relay-read";

import type {
  ChatAudienceCount,
  ChatPerson,
  ChatRecipient,
  SentChatMessage,
  TicketCounts,
  TicketDetail,
  TicketEvent,
} from "@/actions/chat/chat.types";
import type { ListChatMessagesData } from "@/actions/chat/list-chat-messages";
import type { ListTicketsData, ListTicketsProps } from "@/actions/chat/tickets";

/**
 * The chat's reads, from the browser through the relay (lib/relay-read).
 *
 * They were Server Actions: the panel's list, the search, the open ticket's
 * trail and the badge's counts all waited for one another in Next's action
 * queue, and a navigation dropped whatever was still queued. Same API
 * paths, same token, same answers; writes (send, read cursors, ticket
 * moves) stay Server Actions. Each rejects with a `RelayReadError` carrying
 * the status and the API's code; `relayAnswer` turns one into the old
 * `{ success, message, data }` value for callers written around it.
 */

interface ReadOptions {
  signal?: AbortSignal;
}

// ============================================================== tickets

async function fetchTicketsSummary(
  { businessId }: { businessId?: string } = {},
  { signal }: ReadOptions = {},
): Promise<TicketCounts> {
  return relayJson<TicketCounts>(
    relayUrl("/chat/tickets/summary", readQuery({ businessId })),
    {
      signal,
      errorMessage: "Houve um erro ao carregar o resumo dos atendimentos.",
    },
  );
}

async function fetchTickets(
  props: ListTicketsProps,
  { signal }: ReadOptions = {},
): Promise<ListTicketsData> {
  const query = readQuery({
    businessId: props.businessId,
    status: props.status ?? "OPEN",
    scope: props.scope ?? "ALL",
    kind: props.kind,
    driverId: props.driverId,
    deliveryId: props.deliveryId,
    routeId: props.routeId,
    occurrenceId: props.occurrenceId,
    search: props.search?.trim(),
    page: props.page ?? 1,
    pageSize: props.pageSize ?? 30,
  });

  return relayJson<ListTicketsData>(relayUrl("/chat/tickets", query), {
    signal,
    errorMessage: "Houve um erro ao carregar os atendimentos.",
  });
}

async function fetchTicket(
  { ticketId, businessId }: { ticketId: string; businessId?: string },
  { signal }: ReadOptions = {},
): Promise<TicketDetail> {
  const answer = await relayJson<{ data: TicketDetail }>(
    relayUrl(
      `/chat/tickets/${encodeURIComponent(ticketId)}`,
      readQuery({ businessId }),
    ),
    { signal, errorMessage: "Houve um erro ao carregar o atendimento." },
  );

  return answer.data;
}

async function fetchTicketEvents(
  { ticketId, businessId }: { ticketId: string; businessId?: string },
  { signal }: ReadOptions = {},
): Promise<{ data: TicketEvent[] }> {
  return relayJson<{ data: TicketEvent[] }>(
    relayUrl(
      `/chat/tickets/${encodeURIComponent(ticketId)}/events`,
      readQuery({ businessId }),
    ),
    {
      signal,
      errorMessage: "Houve um erro ao carregar o histórico do atendimento.",
    },
  );
}

async function fetchTicketAssignees(
  { businessId, search }: { businessId?: string; search?: string },
  { signal }: ReadOptions = {},
): Promise<{ data: ChatPerson[] }> {
  return relayJson<{ data: ChatPerson[] }>(
    relayUrl("/chat/tickets/assignees", readQuery({ businessId, search })),
    { signal, errorMessage: "Houve um erro ao carregar os atendentes." },
  );
}

// ============================================================= messages

interface ChatMessagesQuery {
  businessId?: string;
  threadId?: string;
  driverId?: string;
  before?: { created_at: string; id: string };
  after?: { created_at: string; id: string };
  around?: string;
  limit?: number;
  search?: string;
  deliveryId?: string;
  routeId?: string;
  ticketId?: string;
}

/** One window of a conversation, cursors and receipts included. */
type ChatMessagesPage = ListChatMessagesData;

async function fetchChatMessages(
  props: ChatMessagesQuery,
  { signal }: ReadOptions = {},
): Promise<ChatMessagesPage> {
  const query = readQuery({
    limit: props.limit ?? 40,
    threadId: props.threadId,
    driverId: props.driverId,
    beforeAt: props.before?.created_at,
    beforeId: props.before?.id,
    afterAt: props.after?.created_at,
    afterId: props.after?.id,
    aroundMessageId: props.around,
    search: props.search,
    deliveryId: props.deliveryId,
    routeId: props.routeId,
    ticketId: props.ticketId,
    businessId: props.businessId,
  });

  const page = await relayJson<ChatMessagesPage>(
    relayUrl("/chat/list-messages", query),
    { signal, errorMessage: "Houve um erro ao carregar a conversa." },
  );

  // The two window fields are normalised rather than trusted: a page from
  // the end of the conversation legitimately omits them.
  return {
    ...page,
    previousCursor: page.previousCursor ?? null,
    hasNewer: Boolean(page.hasNewer),
  };
}

async function fetchChatSearch(
  {
    businessId,
    search,
    limit = 20,
  }: { businessId?: string; search: string; limit?: number },
  { signal }: ReadOptions = {},
): Promise<SentChatMessage[]> {
  const answer = await relayJson<{ data?: SentChatMessage[] }>(
    relayUrl("/chat/search-messages", readQuery({ search, limit, businessId })),
    { signal, errorMessage: "Houve um erro ao buscar mensagens." },
  );

  return answer.data ?? [];
}

interface ChatRecipientsPage {
  data: ChatRecipient[];
  nextCursor: string | null;
  hasMore: boolean;
  audience: ChatAudienceCount | null;
}

async function fetchChatRecipients(
  props: {
    businessId?: string;
    search?: string;
    app?: "WITH_APP" | "WITHOUT_APP";
    cursor?: string;
    limit?: number;
  },
  { signal }: ReadOptions = {},
): Promise<ChatRecipientsPage> {
  const answer = await relayJson<Partial<ChatRecipientsPage>>(
    relayUrl(
      "/chat/recipients",
      readQuery({
        limit: props.limit ?? 20,
        search: props.search,
        app: props.app,
        cursor: props.cursor,
        businessId: props.businessId,
      }),
    ),
    { signal, errorMessage: "Houve um erro ao carregar os motoristas." },
  );

  return {
    data: answer.data ?? [],
    nextCursor: answer.nextCursor ?? null,
    hasMore: Boolean(answer.hasMore),
    audience: answer.audience ?? null,
  };
}

// ====================================================== ticket contexts

type TicketContextKind = "DELIVERY" | "ROUTE";

interface TicketContextOption {
  id: string;
  label: string;
  description: string | null;
}

/** Deliveries a tower still talks about; closed ones are done. */
const OPEN_DELIVERY_STATUSES = "PENDING,IN_TRANSIT,FAILED";

/** Routes not finished nor cancelled. */
const OPEN_ROUTE_STATUSES = "PLANNED,RELEASED,IN_PROGRESS";

/** One page: a driver holds a day's work, and the search finds the rest. */
const CONTEXT_PAGE_SIZE = 20;

function deliveryOption(row: Record<string, any>): TicketContextOption {
  const place = [row.city, row.uf].filter(Boolean).join("/");

  return {
    id: String(row.id),
    label: String(row.recipient_name ?? "Entrega"),
    description: place || null,
  };
}

function routeOption(row: Record<string, any>): TicketContextOption {
  return {
    id: String(row.id),
    label: row.name ? `Rota ${row.code} · ${row.name}` : `Rota ${row.code}`,
    description:
      typeof row.destination === "string" && row.destination
        ? row.destination
        : null,
  };
}

/**
 * What "+ Novo atendimento" can be about (design §6.1): the chosen driver's
 * deliveries and routes still in play, searched on the server through the
 * same listings as the boards, so the search reads the same fields.
 */
async function fetchTicketContexts(
  input: {
    businessId?: string;
    driverId: string;
    kind: TicketContextKind;
    search?: string;
  },
  { signal }: ReadOptions = {},
): Promise<TicketContextOption[]> {
  const isDelivery = input.kind === "DELIVERY";

  const query = readQuery({
    page: 1,
    pageSize: CONTEXT_PAGE_SIZE,
    driverId: input.driverId,
    status: isDelivery ? OPEN_DELIVERY_STATUSES : OPEN_ROUTE_STATUSES,
    businessId: input.businessId,
    search: input.search?.trim().slice(0, 100),
  });

  const options = {
    signal,
    errorMessage: isDelivery
      ? "Não foi possível carregar as entregas do motorista."
      : "Não foi possível carregar as rotas do motorista.",
  };

  if (isDelivery) {
    const { data } = await relayNdjson<Record<string, any>>(
      relayUrl("/delivery/list-delivery", query),
      options,
    );

    return data.map(deliveryOption);
  }

  const { data } = await relayNdjson<Record<string, any>>(
    relayUrl("/route/list-routes", query),
    options,
  );

  return data.map(routeOption);
}

export {
  fetchTicketsSummary,
  fetchTickets,
  fetchTicket,
  fetchTicketEvents,
  fetchTicketAssignees,
  fetchChatMessages,
  fetchChatSearch,
  fetchChatRecipients,
  fetchTicketContexts,
};
export type {
  ChatMessagesQuery,
  ChatMessagesPage,
  ChatRecipientsPage,
  TicketContextKind,
  TicketContextOption,
};
