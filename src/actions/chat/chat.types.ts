type ChatMessageKind = "TEXT" | "IMAGE" | "AUDIO";

interface ChatPerson {
  id: string;
  name: string;
}

/** A message as the API presents it: attachment already a signed URL. */
interface ChatMessage {
  id: string;
  kind: ChatMessageKind;
  body: string | null;
  attachment_url: string | null;
  duration_ms: number | null;
  deliveryId: string | null;
  broadcast_id: string | null;
  client_submission_id: string | null;
  threadId: string;
  senderId: string;
  sender: ChatPerson;
  delivery: { id: string; recipient_name: string; status: string } | null;
  created_at: string;
}

/** The send response and the chatMessage socket payload share this shape. */
interface SentChatMessage extends ChatMessage {
  driver: ChatPerson;
}

/**
 * Which counter acknowledged a thread: the driver's phone, or the company's
 * team — the most advanced confirmation of any panel the company has open.
 */
type ChatReceiptSide = "DRIVER" | "STAFF";

/**
 * The `chatDelivered` socket payload: `side` acknowledged the thread up to
 * `delivered_at`. The API routes each receipt to the opposite counter, so
 * this pane only ever sees `DRIVER` — and filters on it anyway, because a
 * cursor landing on the wrong side would show a check nobody earned.
 */
interface ChatDeliveredEvent {
  threadId: string;
  side: ChatReceiptSide;
  driverUserId: string | null;
  delivered_at: string;
}

/**
 * The driver's app account.
 *
 * Null is the API saying, for real, that this driver has no access to the
 * app — never "the caller happens not to know". Both the thread list and the
 * message list answer it, so the conversation can stand on its own.
 */
interface ChatDriverUser {
  id: string;
  last_seen_at: string | null;
}

interface ChatThreadEntry {
  id: string;
  driver: { id: string; name: string; cnh: string };

  /** The list adds presence: it is the only surface that tracks it. */
  driverUser: (ChatDriverUser & { online: boolean }) | null;
  lastMessage: {
    kind: ChatMessageKind;
    body: string | null;
    sender: ChatPerson;
    created_at: string;
  } | null;
  unreadCount: number;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;

  /** True when the API refused with 403 — the Entregas module is off. */
  moduleDisabled?: boolean;
}

export type {
  ChatMessageKind,
  ChatPerson,
  ChatMessage,
  SentChatMessage,
  ChatReceiptSide,
  ChatDeliveredEvent,
  ChatDriverUser,
  ChatThreadEntry,
  ActionResponse,
};
