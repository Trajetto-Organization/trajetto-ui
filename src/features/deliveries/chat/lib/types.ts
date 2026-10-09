import type { ChatMessage, ChatThreadEntry } from "@/actions/chat/chat.types";

/**
 * A message as the conversation renders it: the server shape plus the
 * optimistic-send lifecycle. `pending` shows the clock, `failed` offers the
 * retry — the client_submission_id makes that retry safe by construction.
 */
interface ClientChatMessage extends ChatMessage {
  pending?: boolean;
  failed?: boolean;
}

/**
 * Who the right pane is talking to.
 *
 * The driver is the identity; `threadId` and `driverUser` are hints the list
 * hands over when it happens to know them. Null in either means "not known
 * here" — the conversation resolves both from the API, so neither may be
 * read as "there is no thread" or "he has no app account".
 */
interface ChatTarget {
  driverId: string;
  driverName: string;
  cnh?: string;
  threadId: string | null;
  driverUser: ChatThreadEntry["driverUser"];
}

/** The delivery context chip carried into the composer. */
interface ChatDeliveryChip {
  id: string;
  recipient_name: string;
}

/**
 * "Open this conversation ON this message" — what clicking a search hit
 * asks for.
 *
 * The token is what makes a second hit inside the SAME conversation a new
 * request. Without it, jumping from one hit to another hit of the same
 * driver would change nothing the pane can see, and the second click would
 * land the reader nowhere.
 */
interface ChatFocusRequest {
  messageId: string;
  token: number;
}

/**
 * The conversation narrowed to one delivery's or one route's messages
 * (decision 6.7). The thread stays one per driver; this only changes which
 * of its messages the pane asks for.
 */
interface ChatHistoryFilter {
  /**
   * "ticket" (decision 14.5): the conversation of one support ticket — the
   * composer then writes INTO that ticket.
   */
  kind: "delivery" | "route" | "ticket";
  id: string;

  /** What the banner says: the recipient, "Rota 12" or "#128". */
  label: string;
}

export type {
  ClientChatMessage,
  ChatTarget,
  ChatDeliveryChip,
  ChatFocusRequest,
  ChatHistoryFilter,
};
