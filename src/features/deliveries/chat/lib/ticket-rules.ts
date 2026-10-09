import type {
  TicketCloseOutcome,
  TicketCounts,
  TicketEvent,
  TicketKind,
  TicketOutcome,
  TicketSummary,
} from "@/actions/chat/chat.types";
import type { TicketScope, TicketStatusFilter } from "@/actions/chat/tickets";

import { optionalMultilineText } from "../../lib/text-rules";

/**
 * The support tickets' pure rules on the web (decision 14.5): the list's
 * filters, the words of each kind/outcome/event, what "Encerrar" offers and
 * what its note needs. Tested without a browser.
 */

/** The react-query roots the tickets live under. */
const TICKETS_QUERY_ROOT = "chat-tickets";
const TICKETS_SUMMARY_ROOT = "chat-tickets-summary";

type TicketFilterKey =
  "OPEN" | "MINE" | "UNASSIGNED" | "PENDING_AUTHORIZATION" | "CLOSED";

interface TicketFilterOption {
  key: TicketFilterKey;
  label: string;
  query: { status: TicketStatusFilter; scope: TicketScope };
  /** Which count of the summary the chip shows. */
  count: keyof TicketCounts | null;
}

const TICKET_FILTERS: TicketFilterOption[] = [
  {
    key: "OPEN",
    label: "Abertos",
    query: { status: "OPEN", scope: "ALL" },
    count: "open",
  },
  {
    key: "MINE",
    label: "Meus",
    query: { status: "OPEN", scope: "MINE" },
    count: "mine",
  },
  {
    key: "UNASSIGNED",
    label: "Sem atendente",
    query: { status: "OPEN", scope: "UNASSIGNED" },
    count: "unassigned",
  },
  {
    key: "PENDING_AUTHORIZATION",
    label: "Aguardando autorização",
    query: { status: "OPEN", scope: "PENDING_AUTHORIZATION" },
    count: "pendingAuthorization",
  },
  {
    key: "CLOSED",
    label: "Encerrados",
    query: { status: "CLOSED", scope: "ALL" },
    count: null,
  },
];

function ticketFilterQuery(key: TicketFilterKey): {
  status: TicketStatusFilter;
  scope: TicketScope;
} {
  return (
    TICKET_FILTERS.find((option) => option.key === key) ?? TICKET_FILTERS[0]
  ).query;
}

const KIND_LABELS: Record<TicketKind, string> = {
  OCCURRENCE: "Ocorrência",
  DELIVERY: "Entrega",
  ROUTE: "Rota",
  DRIVER: "Geral",
  LEGACY: "Conversa anterior",
};

const OUTCOME_LABELS: Record<TicketOutcome, string> = {
  RESOLVED: "Resolvido",
  APPROVED: "Autorizado: pode seguir",
  DENIED: "Negado",
  MIGRATED: "Histórico migrado",
};

function ticketKindLabel(kind: TicketKind): string {
  return KIND_LABELS[kind] ?? kind;
}

function ticketOutcomeLabel(outcome: TicketOutcome | null): string {
  return outcome ? (OUTCOME_LABELS[outcome] ?? outcome) : "";
}

/** "#128 · Cliente ausente — Mercado Sol". */
function ticketTitle(
  ticket: Pick<TicketSummary, "number" | "subject">,
): string {
  return `#${ticket.number} · ${ticket.subject}`;
}

/**
 * Who handles it, in the list's words. The driver's side never sees this
 * line; inside the company it is what tells a dispatcher whose turn it is.
 */
function assigneeLine(
  ticket: Pick<TicketSummary, "assignee" | "status">,
  myUserId: string | null,
): string {
  if (!ticket.assignee) return ticket.status === "OPEN" ? "Sem atendente" : "—";

  return ticket.assignee.id === myUserId
    ? "Com você"
    : `Com ${ticket.assignee.name}`;
}

/** "Encerrado por Ana em 05/10 às 14:02 — Autorizado: pode seguir". */
function closedLine(
  ticket: Pick<TicketSummary, "closedBy" | "closed_at" | "close_outcome">,
  formatDate: (iso: string) => string,
): string {
  const who = ticket.closedBy ? ` por ${ticket.closedBy.name}` : "";
  const when = ticket.closed_at ? ` em ${formatDate(ticket.closed_at)}` : "";
  const outcome = ticket.close_outcome
    ? ` — ${ticketOutcomeLabel(ticket.close_outcome)}`
    : "";

  return `Atendimento encerrado${who}${when}${outcome}`;
}

/** One line of the trail, as the conversation intercalates it. */
function ticketEventLine(event: TicketEvent): string {
  const actor =
    event.actor_kind === "SYSTEM"
      ? "O sistema"
      : (event.actor_name ?? "Alguém");
  const note = event.note ? `: ${event.note}` : "";

  switch (event.type) {
    case "OPENED":
      return event.actor_kind === "SYSTEM"
        ? "Atendimento aberto automaticamente"
        : `${actor} abriu o atendimento`;
    case "ASSIGNED":
      return event.actor_kind === "SYSTEM" ||
        event.actorId === event.target_user_id
        ? `${event.target_user_name ?? "Alguém"} assumiu o atendimento`
        : `${actor} passou o atendimento para ${event.target_user_name ?? "outra pessoa"}`;
    case "UNASSIGNED":
      return `${actor} liberou o atendimento`;
    case "CLOSED":
      return `${actor} encerrou — ${ticketOutcomeLabel(event.outcome)}${note}`;
    case "REOPENED":
      return `${actor} reabriu o atendimento${note}`;
    case "OCCURRENCE_LINKED":
      return `Ocorrência registrada neste atendimento${note}`;
    case "AUTHORIZATION_DECIDED":
      return event.outcome === "APPROVED"
        ? `${actor} autorizou a ocorrência${note}`
        : `${actor} negou a ocorrência${note}`;
    case "AUTHORIZATION_SUPERSEDED":
      return "O pedido de autorização foi encerrado: a entrega foi resolvida antes da decisão";
    default:
      return "";
  }
}

const closeNoteSchema = optionalMultilineText("A observação", 500);

/**
 * Why the close cannot go yet, or null. Denying needs a reason (the driver
 * reads it), like the queue; the other outcomes take an optional note.
 */
function closeNoteProblem(
  outcome: TicketCloseOutcome,
  note: string,
): string | null {
  if (outcome === "DENIED" && note.trim() === "") {
    return "Diga ao motorista por que o pedido foi negado.";
  }

  const parsed = closeNoteSchema.safeParse(note);

  return parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? "Observação inválida.");
}

/**
 * The sentence for a refused close/assign, by the API's code: a 409 says who
 * already closed or holds it; the rest keep the API's own words.
 */
function ticketFailureMessage(
  failure:
    { code: string | null; details: Record<string, unknown> } | undefined,
  fallback: string,
): string {
  if (!failure) return fallback;

  const person = (value: unknown) =>
    value &&
    typeof value === "object" &&
    typeof (value as { name?: unknown }).name === "string"
      ? (value as { name: string }).name
      : null;

  switch (failure.code) {
    case "SUPPORT_TICKET_ALREADY_CLOSED": {
      const who = person(failure.details.closedBy);

      return who
        ? `${who} já encerrou este atendimento.`
        : "Este atendimento já foi encerrado.";
    }
    case "SUPPORT_TICKET_ASSIGNEE_CHANGED": {
      const who = person(failure.details.assignee);

      return who
        ? `${who} já assumiu este atendimento.`
        : "O atendente mudou. Atualize e tente de novo.";
    }
    case "OCCURRENCE_ALREADY_DECIDED": {
      const decision = failure.details.decision as
        | { status?: string; authorizedBy?: { name?: string } | null }
        | undefined;
      const who = decision?.authorizedBy?.name ?? "Outra pessoa";

      if (decision?.status === "SUPERSEDED") {
        return "O pedido foi encerrado: a tentativa terminou antes da decisão.";
      }

      return decision?.status === "APPROVED"
        ? `${who} já autorizou esta ocorrência.`
        : `${who} já negou esta ocorrência.`;
    }
    default:
      return fallback;
  }
}

/** The tab badge: unread open tickets, and a red dot while a request waits. */
function ticketBadge(counts: TicketCounts | null | undefined): {
  count: number;
  urgent: boolean;
} {
  return {
    count: counts?.unreadOpen ?? 0,
    urgent: (counts?.pendingAuthorization ?? 0) > 0,
  };
}

export {
  TICKETS_QUERY_ROOT,
  TICKETS_SUMMARY_ROOT,
  TICKET_FILTERS,
  ticketFilterQuery,
  ticketKindLabel,
  ticketOutcomeLabel,
  ticketTitle,
  assigneeLine,
  closedLine,
  ticketEventLine,
  closeNoteProblem,
  ticketFailureMessage,
  ticketBadge,
};
export type { TicketFilterKey, TicketFilterOption };

type OccurrenceConversationStep =
  { kind: "open"; ticketId: string } | { kind: "none"; message: string };

/**
 * What "Ver conversa" does on an occurrence row (design §6.3): its ticket
 * when there is one, an explanation otherwise. Viewing NEVER opens a ticket:
 * a new one rings every operator's balloon and gives the driver a new
 * subject, so that is the explicit "Abrir atendimento" item's job.
 */
function occurrenceConversationStep(
  ticket: { id: string } | null | undefined,
  canOpen: boolean,
): OccurrenceConversationStep {
  if (ticket) return { kind: "open", ticketId: ticket.id };

  return {
    kind: "none",
    message: canOpen
      ? "Esta ocorrência ainda não tem atendimento. Use “Abrir atendimento” no menu da linha."
      : "Esta ocorrência não tem atendimento, e seu perfil permite apenas a leitura.",
  };
}

/**
 * Why "Abrir atendimento" is unavailable to this person, or null when it is
 * (design §6.3: disabled WITH the reason, never hidden).
 */
function openTicketBlockedReason(
  role: string | null,
  canWrite: boolean,
): string | null {
  if (role === "MASTER")
    return "O suporte da plataforma apenas acompanha os atendimentos.";

  if (!canWrite) return "Seu perfil permite apenas a leitura dos atendimentos.";

  return null;
}

/**
 * The instant a ticket's read cursor should move to, or null when nothing
 * should be sent. The cursor only ever claims a message actually rendered
 * (never the client's clock), and the same or an older instant for the same
 * ticket is not sent again.
 */
function ticketReadTarget(
  last: { ticketId: string; at: string } | null,
  ticketId: string,
  newestRenderedAt: string | null,
): { ticketId: string; at: string } | null {
  if (!newestRenderedAt) return null;

  if (last && last.ticketId === ticketId && last.at >= newestRenderedAt)
    return null;

  return { ticketId, at: newestRenderedAt };
}

export {
  occurrenceConversationStep,
  openTicketBlockedReason,
  ticketReadTarget,
};
export type { OccurrenceConversationStep };
