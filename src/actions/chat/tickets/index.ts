"use server";

import type {
  ChatMessageKind,
  ChatPerson,
  SentChatMessage,
  TicketCloseOutcome,
  TicketCounts,
  TicketDetail,
  TicketEvent,
  TicketKind,
  TicketSummary,
} from "../chat.types";

import { ticketRequest, type TicketActionResponse } from "./ticket-request";

/**
 * The support ticket actions (decision 14.5, design §6.1). Each is a thin
 * call to /chat/tickets; the MASTER passes the company it selected.
 */

type TicketStatusFilter = "OPEN" | "CLOSED" | "ALL";
type TicketScope = "ALL" | "MINE" | "UNASSIGNED" | "PENDING_AUTHORIZATION";

interface ListTicketsProps {
  businessId?: string;
  status?: TicketStatusFilter;
  scope?: TicketScope;
  kind?: TicketKind;
  driverId?: string;
  deliveryId?: string;
  routeId?: string;
  occurrenceId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface ListTicketsData {
  data: TicketSummary[];
  total: number;
  counts: TicketCounts;
}

async function listTickets(
  props: ListTicketsProps,
): Promise<TicketActionResponse<ListTicketsData>> {
  return ticketRequest<ListTicketsData>({
    path: "/chat/tickets",
    query: {
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
    },
    logName: "chat/tickets/list",
    successMessage: "Atendimentos carregados.",
    errorMessage: "Houve um erro ao carregar os atendimentos.",
  });
}

async function getTicketsSummary({
  businessId,
}: {
  businessId?: string;
}): Promise<TicketActionResponse<TicketCounts>> {
  return ticketRequest<TicketCounts>({
    path: "/chat/tickets/summary",
    query: { businessId },
    logName: "chat/tickets/summary",
    successMessage: "Resumo carregado.",
    errorMessage: "Houve um erro ao carregar o resumo dos atendimentos.",
  });
}

async function getTicket({
  ticketId,
  businessId,
}: {
  ticketId: string;
  businessId?: string;
}): Promise<TicketActionResponse<TicketDetail>> {
  const result = await ticketRequest<{ data: TicketDetail }>({
    path: `/chat/tickets/${encodeURIComponent(ticketId)}`,
    query: { businessId },
    logName: "chat/tickets/get",
    successMessage: "Atendimento carregado.",
    errorMessage: "Houve um erro ao carregar o atendimento.",
  });

  return result.success && result.data
    ? { ...result, data: result.data.data }
    : { ...result, data: undefined };
}

interface OpenTicketProps {
  businessId?: string;
  driverId?: string;
  deliveryId?: string;
  routeId?: string;
  occurrenceId?: string;
  subject?: string;
  message?: {
    kind: ChatMessageKind;
    body?: string;
    clientSubmissionId?: string;
  };

  /** One key per form (IDEMP-14): a retried create answers the same ticket. */
  idempotencyKey: string;
}

interface OpenTicketData {
  data: TicketSummary;
  created: boolean;
  message: SentChatMessage | null;
}

async function openTicket(
  props: OpenTicketProps,
): Promise<TicketActionResponse<OpenTicketData>> {
  const { idempotencyKey, ...body } = props;

  return ticketRequest<OpenTicketData>({
    path: "/chat/tickets",
    method: "POST",
    body: Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    ),
    idempotencyKey,
    logName: "chat/tickets/open",
    successMessage: "Atendimento aberto!",
    errorMessage: "Houve um erro ao abrir o atendimento.",
  });
}

interface CloseTicketData {
  message: string;
  data: TicketSummary;
  replayed: boolean;
}

async function closeTicket(props: {
  ticketId: string;
  outcome: TicketCloseOutcome;
  note?: string;
  businessId?: string;
}): Promise<TicketActionResponse<CloseTicketData>> {
  const result = await ticketRequest<CloseTicketData>({
    path: `/chat/tickets/${encodeURIComponent(props.ticketId)}/close`,
    method: "POST",
    query: { businessId: props.businessId },
    body: {
      outcome: props.outcome,
      ...(props.note?.trim() && { note: props.note.trim() }),
    },
    logName: "chat/tickets/close",
    successMessage: "Atendimento encerrado.",
    errorMessage: "Houve um erro ao encerrar o atendimento.",
  });

  // The API's own sentence for the outcome ("Ocorrência autorizada…").
  return result.success && result.data
    ? { ...result, message: result.data.message }
    : result;
}

async function assignTicket(props: {
  ticketId: string;
  assigneeId: string | null;
  expectedAssigneeId?: string | null;
  businessId?: string;
}): Promise<TicketActionResponse<{ data: TicketSummary; replayed: boolean }>> {
  return ticketRequest({
    path: `/chat/tickets/${encodeURIComponent(props.ticketId)}/assign`,
    method: "POST",
    query: { businessId: props.businessId },
    body: {
      assigneeId: props.assigneeId,
      ...(props.expectedAssigneeId !== undefined && {
        expectedAssigneeId: props.expectedAssigneeId,
      }),
    },
    logName: "chat/tickets/assign",
    successMessage: props.assigneeId
      ? "Atendente definido."
      : "Atendimento liberado.",
    errorMessage: "Houve um erro ao alterar o atendente.",
  });
}

async function reopenTicket(props: {
  ticketId: string;
  note?: string;
  businessId?: string;
}): Promise<TicketActionResponse<{ data: TicketSummary; replayed: boolean }>> {
  return ticketRequest({
    path: `/chat/tickets/${encodeURIComponent(props.ticketId)}/reopen`,
    method: "POST",
    query: { businessId: props.businessId },
    body: props.note?.trim() ? { note: props.note.trim() } : {},
    logName: "chat/tickets/reopen",
    successMessage: "Atendimento reaberto.",
    errorMessage: "Houve um erro ao reabrir o atendimento.",
  });
}

async function listTicketEvents(props: {
  ticketId: string;
  businessId?: string;
}): Promise<TicketActionResponse<{ data: TicketEvent[] }>> {
  return ticketRequest({
    path: `/chat/tickets/${encodeURIComponent(props.ticketId)}/events`,
    query: { businessId: props.businessId },
    logName: "chat/tickets/events",
    successMessage: "Histórico carregado.",
    errorMessage: "Houve um erro ao carregar o histórico do atendimento.",
  });
}

async function markTicketRead(props: {
  ticketId: string;
  readAt?: string;
  businessId?: string;
}): Promise<TicketActionResponse<{ data: { last_read_at: string } }>> {
  return ticketRequest({
    path: `/chat/tickets/${encodeURIComponent(props.ticketId)}/read`,
    method: "POST",
    query: { businessId: props.businessId },
    body: props.readAt ? { readAt: props.readAt } : {},
    logName: "chat/tickets/read",
    successMessage: "Atendimento lido.",
    errorMessage: "Houve um erro ao marcar o atendimento como lido.",
  });
}

async function listTicketAssignees(props: {
  businessId?: string;
  search?: string;
}): Promise<TicketActionResponse<{ data: ChatPerson[] }>> {
  return ticketRequest({
    path: "/chat/tickets/assignees",
    query: { businessId: props.businessId, search: props.search },
    logName: "chat/tickets/assignees",
    successMessage: "Atendentes carregados.",
    errorMessage: "Houve um erro ao carregar os atendentes.",
  });
}

/** Decision 14.6: the user's own alert sound switch (GET/PUT preferences). */
async function getOpsAlertSound(): Promise<
  TicketActionResponse<{ sound: boolean }>
> {
  const result = await ticketRequest<{ opsAlert?: { sound: boolean } }>({
    path: "/notification/preferences",
    logName: "chat/tickets/ops-alert-get",
    successMessage: "Preferência carregada.",
    errorMessage: "Houve um erro ao carregar a preferência de som.",
  });

  return result.success
    ? { ...result, data: { sound: result.data?.opsAlert?.sound ?? true } }
    : { ...result, data: undefined };
}

async function updateOpsAlertSound(
  sound: boolean,
): Promise<TicketActionResponse<{ sound: boolean }>> {
  const result = await ticketRequest<{ message: string }>({
    path: "/notification/preferences",
    method: "PUT",
    body: { opsAlert: { sound } },
    logName: "chat/tickets/ops-alert-update",
    successMessage: sound
      ? "Som dos alertas ligado."
      : "Som dos alertas desligado.",
    errorMessage: "Houve um erro ao salvar a preferência de som.",
  });

  return result.success
    ? { ...result, data: { sound } }
    : { ...result, data: undefined };
}

export {
  listTickets,
  getTicketsSummary,
  getTicket,
  openTicket,
  closeTicket,
  assignTicket,
  reopenTicket,
  listTicketEvents,
  markTicketRead,
  listTicketAssignees,
  getOpsAlertSound,
  updateOpsAlertSound,
};
export type {
  ListTicketsProps,
  ListTicketsData,
  OpenTicketData,
  TicketScope,
  TicketStatusFilter,
};
