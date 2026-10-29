import type {
  SentChatMessage,
  SupportTicketRealtimeEvent,
} from "@/actions/chat/chat.types";

/**
 * The floating operations alert (decision 14.6, design §6.6) as pure rules:
 * which event becomes a card, which card plays a sound, which one is
 * suppressed, and the dedupe that keeps a reconnection or two replicas from
 * showing the same event twice. Tested without a browser.
 */

type AlertTone = "authorization" | "occurrence" | "driver";

interface AlertCard {
  /** Dedupe key: one card per event, whatever delivered it twice. */
  key: string;
  ticketId: string;
  tone: AlertTone;
  title: string;
  description: string;
  /** Authorization requests stay until decided or dismissed. */
  sticky: boolean;
  /** How long a non-sticky card lives. */
  ttlMs: number | null;
  createdAt: number;
  /**
   * The driver's latest message on a ticket whose own card is showing: the
   * message does not replace that card (see `pushCard`), so it rides on it.
   */
  followUp?: string;
  /** Message cards already folded into this one, for dedupe on redelivery. */
  absorbedKeys?: string[];
}

/** Product parameter (design §6.6), not a measurement. */
const ALERT_CARD_TTL_MS = 20_000;

/** At most this many cards stacked; the rest is "+N". */
const ALERT_MAX_CARDS = 3;

/** A burst of events plays one sound. */
const SOUND_MIN_INTERVAL_MS = 3_000;

interface AlertContext {
  myUserId: string | null;
  /** The ticket open on screen right now, if any. */
  openTicketId: string | null;
  /** Whether this window has the focus (a ticket "on screen" needs both). */
  windowFocused: boolean;
  now: number;
}

/** A card for a ticket event, or null when nothing should pop up. */
function cardForTicketEvent(
  event: SupportTicketRealtimeEvent,
  context: AlertContext,
): AlertCard | null {
  if (event.type !== "ticket.opened" && event.type !== "ticket.linked")
    return null;

  // Somebody on this very screen opened it.
  if (event.actor?.id && event.actor.id === context.myUserId) return null;

  const { ticket, alert } = event;

  // Only the server says what calls the tower: a report, a pending request,
  // the driver's new subject. A ticket a colleague opened from the panel
  // ("Abrir atendimento" on an old occurrence) carries no alert and rings
  // nobody, whatever its kind.
  if (!alert) return null;
  const key = `${ticket.id}:${event.type}:${ticket.version}`;
  const subject =
    alert?.occurrenceTypeName && alert.recipientName
      ? `${alert.occurrenceTypeName} — ${alert.recipientName}`
      : ticket.subject;
  const driver = alert?.driverName ?? ticket.driver.name;

  if (alert.reason === "AUTHORIZATION") {
    return {
      key,
      ticketId: ticket.id,
      tone: "authorization",
      title: "Pedido de autorização",
      description: `${subject} · ${driver}`,
      sticky: true,
      ttlMs: null,
      createdAt: context.now,
    };
  }

  if (alert.reason === "OCCURRENCE") {
    return {
      key,
      ticketId: ticket.id,
      tone: "occurrence",
      title: "Ocorrência",
      description: `${subject} · ${driver}`,
      sticky: false,
      ttlMs: ALERT_CARD_TTL_MS,
      createdAt: context.now,
    };
  }

  if (alert.reason === "DRIVER_OPENED") {
    return {
      key,
      ticketId: ticket.id,
      tone: "driver",
      title: `Novo atendimento de ${driver}`,
      description: ticket.subject,
      sticky: false,
      ttlMs: ALERT_CARD_TTL_MS,
      createdAt: context.now,
    };
  }

  return null;
}

/**
 * A card for a chat message, or null. Only the driver's messages in a
 * ticket call the tower; a ticket someone else holds only moves the badge
 * (its owner is the one called); the conversation already on screen with
 * the window focused needs nothing.
 */
function cardForMessage(
  message: SentChatMessage,
  context: AlertContext,
): AlertCard | null {
  if (!message.ticket) return null;

  if (message.senderId === context.myUserId) return null;

  // A message from the tower side is not a call for the tower.
  if (message.senderSide !== "DRIVER") return null;

  if (message.ticket.status !== "OPEN") return null;

  if (
    message.ticket.assigneeId &&
    message.ticket.assigneeId !== context.myUserId
  )
    return null;

  if (context.windowFocused && context.openTicketId === message.ticket.id)
    return null;

  return {
    key: `${MESSAGE_CARD_PREFIX}${message.id}`,
    ticketId: message.ticket.id,
    tone: "driver",
    title: `Mensagem de ${message.driver.name} em #${message.ticket.number}`,
    description:
      message.body?.trim() || (message.kind === "AUDIO" ? "Áudio" : "Foto"),
    sticky: false,
    ttlMs: ALERT_CARD_TTL_MS,
    createdAt: context.now,
  };
}

const MESSAGE_CARD_PREFIX = "message:";

const isMessageCard = (card: AlertCard): boolean =>
  card.key.startsWith(MESSAGE_CARD_PREFIX);

/**
 * Adds a card to the stack: dedupe by key, newest first. A card for a
 * ticket that already has one replaces it (one card per ticket) — except
 * that a driver's message never displaces the ticket's own card: the
 * opening message arrives right behind `ticket.opened` and turned "Novo
 * atendimento" into "Mensagem de … em #N", and a message on a ticket waiting
 * for authorization swapped the red, sticky request for a card that fades.
 * The ticket's card already leads to the conversation, so the message is
 * folded into it as its latest line instead.
 */
function pushCard(cards: AlertCard[], card: AlertCard): AlertCard[] {
  if (
    cards.some(
      (existing) =>
        existing.key === card.key || existing.absorbedKeys?.includes(card.key),
    )
  ) {
    return cards;
  }

  const ticketCard = isMessageCard(card)
    ? cards.find(
        (existing) =>
          existing.ticketId === card.ticketId && !isMessageCard(existing),
      )
    : undefined;

  if (ticketCard) {
    // Folded in, not dropped: a follow-up within the ticket card's life must
    // still show its text and keep the card up for another full TTL.
    const merged: AlertCard = {
      ...ticketCard,
      followUp: card.description,
      absorbedKeys: [...(ticketCard.absorbedKeys ?? []), card.key],
      createdAt: Math.max(ticketCard.createdAt, card.createdAt),
    };

    return [merged, ...cards.filter((existing) => existing !== ticketCard)];
  }

  return [
    card,
    ...cards.filter((existing) => existing.ticketId !== card.ticketId),
  ];
}

/** What survives a tick: sticky cards, and the others within their life. */
function liveCards(cards: AlertCard[], now: number): AlertCard[] {
  return cards.filter(
    (card) =>
      card.sticky || card.ttlMs === null || now - card.createdAt < card.ttlMs,
  );
}

/** A ticket closed or taken: its cards go, in every tab. */
function dropTicketCards(cards: AlertCard[], ticketId: string): AlertCard[] {
  return cards.filter((card) => card.ticketId !== ticketId);
}

/** Which events take a ticket's cards away. */
function clearsCards(
  event: SupportTicketRealtimeEvent,
  myUserId: string | null,
): boolean {
  if (event.type === "ticket.closed") return true;

  // Taken by someone else: they were called, not this screen.
  if (event.type === "ticket.assigned") {
    return Boolean(
      event.ticket.assignee && event.ticket.assignee.id !== myUserId,
    );
  }

  return event.type === "ticket.authorization_changed";
}

/** The visible stack and the "+N" beyond it. */
function visibleCards(cards: AlertCard[]): {
  shown: AlertCard[];
  hidden: number;
} {
  return {
    shown: cards.slice(0, ALERT_MAX_CARDS),
    hidden: Math.max(0, cards.length - ALERT_MAX_CARDS),
  };
}

/** Whether a new card rings: sound on, this tab the leader, not too soon. */
function shouldPlaySound(input: {
  soundEnabled: boolean;
  isSoundLeader: boolean;
  lastPlayedAt: number | null;
  now: number;
}): boolean {
  if (!input.soundEnabled || !input.isSoundLeader) return false;

  return (
    input.lastPlayedAt === null ||
    input.now - input.lastPlayedAt >= SOUND_MIN_INTERVAL_MS
  );
}

/**
 * Versioned cache (design §7.4): an event older than what this client
 * already applied for the ticket is dropped — replicas do not promise order.
 */
function acceptsVersion(
  applied: Map<string, number>,
  ticketId: string,
  version: number,
): boolean {
  const current = applied.get(ticketId);

  if (current !== undefined && version <= current) return false;

  applied.set(ticketId, version);

  return true;
}

/** The persistent pill: "3 aguardando · 1 autorização", or null. */
function summaryPill(
  counts:
    | {
        unassigned: number;
        pendingAuthorization: number;
        unreadOpen: number;
      }
    | null
    | undefined,
): string | null {
  if (!counts) return null;

  const parts: string[] = [];

  if (counts.unassigned > 0) parts.push(`${counts.unassigned} sem atendente`);
  if (counts.pendingAuthorization > 0) {
    parts.push(
      counts.pendingAuthorization === 1
        ? "1 autorização"
        : `${counts.pendingAuthorization} autorizações`,
    );
  }
  if (counts.unreadOpen > 0) {
    parts.push(
      counts.unreadOpen === 1 ? "1 não lido" : `${counts.unreadOpen} não lidos`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export {
  ALERT_CARD_TTL_MS,
  ALERT_MAX_CARDS,
  SOUND_MIN_INTERVAL_MS,
  cardForTicketEvent,
  cardForMessage,
  pushCard,
  liveCards,
  dropTicketCards,
  clearsCards,
  visibleCards,
  shouldPlaySound,
  acceptsVersion,
  summaryPill,
};
export type { AlertCard, AlertContext, AlertTone };
