import { optionalMultilineText } from "../lib/text-rules";
import { buildTicketSearchParams } from "../chat/lib/chat-link";

import type {
  PendingAuthorization,
  SettledDecision,
} from "@/actions/delivery/occurrence-authorizations";

/**
 * The tower's queue of occurrences waiting for authorization (decision 6.3),
 * as pure rules: what each card says about time, the reason a denial needs,
 * and the sentence a lost race is answered with.
 */

/** The react-query root the queue lives under (invalidated after a decision). */
const AUTHORIZATION_QUEUE_ROOT = "occurrence-authorizations";

const MINUTE = 60_000;

/** "há instantes", "há 4 min", "há 1 h 05 min": how long the driver has waited. */
function waitingLabel(createdAt: string, now: number): string {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / MINUTE),
  );

  if (minutes < 1) return "há instantes";
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0
    ? `há ${hours} h`
    : `há ${hours} h ${String(rest).padStart(2, "0")} min`;
}

type WaitingTone = "fresh" | "late" | "escalated";

/**
 * Fresh until the escalation instant; late past it (the sweep runs each
 * minute); escalated once the administrators were told.
 */
function waitingTone(
  row: Pick<PendingAuthorization, "escalated_at" | "escalates_at">,
  now: number,
): WaitingTone {
  if (row.escalated_at) return "escalated";

  return now >= new Date(row.escalates_at).getTime() ? "late" : "fresh";
}

/** "Rua das Flores, 12 — Centro — Campinas/SP". */
function addressLine(delivery: PendingAuthorization["delivery"]): string {
  const street = delivery.address_number
    ? `${delivery.street}, ${delivery.address_number}`
    : delivery.street;

  return [street, delivery.neighborhood, `${delivery.city}/${delivery.uf}`]
    .filter(Boolean)
    .join(" — ");
}

const denialNoteSchema = optionalMultilineText("O motivo", 500);

/**
 * Why the note cannot go, or null. A denial needs one (the driver reads it);
 * an approval may carry one. Same rules and words as the API.
 */
function decisionNoteProblem(
  decision: "APPROVED" | "DENIED",
  note: string,
): string | null {
  if (decision === "DENIED" && note.trim() === "") {
    return "Diga ao motorista por que o pedido foi negado.";
  }

  const parsed = denialNoteSchema.safeParse(note);

  return parsed.success
    ? null
    : (parsed.error.issues[0]?.message ?? "Motivo inválido.");
}

/** Decision 14.3: a DELIVERED request asks the tower to PROVE the delivery. */
function isDeliveryRequest(
  request: Pick<PendingAuthorization, "category">,
): boolean {
  return request.category === "DELIVERED";
}

interface DecisionCopy {
  /** The dialog's title. */
  title: string;
  /** The button on the card and in the dialog. */
  action: string;
  /** What the decision does, said before it is done. */
  effect: string;
}

/**
 * The words of one decision. A delivery request reads as a delivery
 * ("Autorizar entrega"): approving it marks the delivery Entregue and tells
 * the shipper, which the generic "pode seguir" would hide.
 */
function decisionCopy(
  request: Pick<PendingAuthorization, "category" | "occurrenceType">,
  decision: "APPROVED" | "DENIED",
): DecisionCopy {
  const denying = decision === "DENIED";

  if (isDeliveryRequest(request)) {
    return denying
      ? {
          title: "Negar entrega",
          action: "Negar entrega",
          effect:
            "A entrega continua em rota. O motorista recebe o motivo no aplicativo, na hora.",
        }
      : {
          title: "Autorizar entrega",
          action: "Autorizar entrega",
          effect:
            "A entrega passa para Entregue com o canhoto e a assinatura acima, no horário em que o motorista registrou. O embarcador é avisado e o motorista recebe a autorização no aplicativo.",
        };
  }

  if (denying) {
    return {
      title: "Negar ocorrência",
      action: "Negar",
      effect:
        "Nada muda na entrega. O motorista recebe o motivo no aplicativo, na hora.",
    };
  }

  return {
    title: "Autorizar ocorrência",
    action: "Autorizar",
    effect: request.occurrenceType.blocks_delivery
      ? "A entrega passa para Insucesso agora, a parada é encerrada e o embarcador é avisado. O motorista recebe a autorização no aplicativo."
      : "O motorista recebe a autorização no aplicativo e segue com a entrega.",
  };
}

/** The answer to the operator who lost the race: who decided what. */
function settledDecisionMessage(
  decision: SettledDecision | undefined,
  fallback: string,
): string {
  if (!decision) return fallback;

  if (decision.status === "SUPERSEDED") {
    return "O pedido foi encerrado: a tentativa terminou antes da decisão (entrega resolvida, cancelada ou levada para outra rota).";
  }

  const who = decision.authorizedBy?.name ?? "Outra pessoa";

  return decision.status === "APPROVED"
    ? `${who} já autorizou esta ocorrência.`
    : `${who} já negou esta ocorrência.`;
}

/**
 * The tower's say on one occurrence of the feed, for a badge. A blocking
 * type waiting or denied failed nothing: without this the feed showed it as
 * "Impeditiva" and nothing else, as if the delivery had failed.
 */
function authorizationBadge(
  status: string | undefined,
): { label: string; className: string } | null {
  switch (status) {
    case "PENDING":
      return {
        label: "Aguardando torre",
        className: "border-amber-200 bg-amber-100 text-amber-900",
      };
    case "APPROVED":
      return {
        label: "Autorizada",
        className: "border-green-200 bg-green-100 text-green-800",
      };
    case "DENIED":
      return {
        label: "Negada pela torre",
        className: "border-red-200 bg-background text-red-800",
      };
    case "SUPERSEDED":
      return {
        label: "Pedido encerrado",
        className: "border-slate-200 bg-slate-100 text-slate-700",
      };
    default:
      return null;
  }
}

type QueueConversationStep =
  { kind: "open"; ticketId: string } | { kind: "none"; message: string };

/**
 * "Ver conversa" on a request (decision 14.5): it only looks. The ticket is
 * opened by the report itself, so a request without one is rare; the
 * operator is told rather than a ticket created behind his back.
 */
function queueConversationStep(
  ticket: { id: string } | null | undefined,
): QueueConversationStep {
  if (ticket) return { kind: "open", ticketId: ticket.id };

  return { kind: "none", message: "Este pedido ainda não tem atendimento." };
}

/**
 * Where the ticket opens: the Atendimentos tab of the deliveries page, in the
 * area the operator is in (/admin or /dashboard). The queue also lives on the
 * control tower, whose own params mean nothing there; only the MASTER's
 * company (`businessId`) travels along.
 */
function queueTicketHref(
  pathname: string | null,
  search: string,
  ticketId: string,
): string {
  const area = pathname?.startsWith("/admin") ? "/admin" : "/dashboard";

  const kept = new URLSearchParams();
  const businessId = new URLSearchParams(search).get("businessId");

  if (businessId) kept.set("businessId", businessId);

  return `${area}/deliveries?${buildTicketSearchParams(kept, ticketId).toString()}`;
}

export {
  AUTHORIZATION_QUEUE_ROOT,
  addressLine,
  authorizationBadge,
  decisionCopy,
  decisionNoteProblem,
  isDeliveryRequest,
  queueConversationStep,
  queueTicketHref,
  settledDecisionMessage,
  waitingLabel,
  waitingTone,
};
export type { DecisionCopy, QueueConversationStep, WaitingTone };
