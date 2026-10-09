import type { AccessError } from "@/lib/access-error";

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

  /**
   * The route the message was said during (decision 6.7). Optional on the
   * type because a page served by an API older than this web omits it.
   */
  routeId?: string | null;
  broadcast_id: string | null;
  client_submission_id: string | null;
  threadId: string;
  senderId: string;
  sender: ChatPerson;
  delivery: { id: string; recipient_name: string; status: string } | null;
  route?: ChatRouteTag | null;
  created_at: string;

  /**
   * The support ticket of the message (decision 14.5). Optional: a page
   * served by an API older than the tickets omits it; null on a mass notice.
   */
  ticketId?: string | null;
}

/** The route a message is about, as the API resolves it. */
interface ChatRouteTag {
  id: string;
  code: number;
  name: string | null;
}

/** What happened to one recipient of a send (decision 6.8). */
type ChatSendStatus = "SENT" | "ALREADY_SENT" | "SKIPPED_NO_APP";

interface ChatSendOutcome {
  driverId: string;
  driverName: string;
  status: ChatSendStatus;
  messageId: string | null;
}

interface ChatSendSummary {
  sent: number;
  alreadySent: number;
  skippedNoApp: number;
}

/**
 * An active driver as the chat pickers list him: only the fields of the
 * choice. The list is read under delivery_manage, so nothing of the driver
 * registration comes along (the CNH used to) — decision 4.7.
 */
interface ChatRecipient {
  id: string;
  name: string;

  /** An app account that can log in: only these receive a mass notice. */
  hasApp: boolean;
}

/** Active drivers of the company on each side of the app line. */
interface ChatAudienceCount {
  withApp: number;
  withoutApp: number;
}

/** The send response and the chatMessage socket payload share this shape. */
interface SentChatMessage extends ChatMessage {
  driver: ChatPerson;

  /** The ticket it landed in; null on a mass notice (decision 14.5). */
  ticket?: ChatMessageTicketRef | null;

  /** Who wrote it: the driver or the tower (absent on an older API). */
  senderSide?: "DRIVER" | "STAFF";
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

  /**
   * Which 403 the API answered (decision 4.1), when it was one. It used to
   * be `moduleDisabled: status === 403`, which read a read-only profile or
   * an inactive company as "módulo não contratado".
   */
  accessError?: AccessError | null;
}

export type {
  ChatMessageKind,
  ChatPerson,
  ChatRouteTag,
  ChatSendStatus,
  ChatSendOutcome,
  ChatSendSummary,
  ChatRecipient,
  ChatAudienceCount,
  ChatMessage,
  SentChatMessage,
  ChatReceiptSide,
  ChatDeliveredEvent,
  ChatDriverUser,
  ChatThreadEntry,
  ActionResponse,
};

// ============================================================ tickets (14.5)

type TicketKind = "OCCURRENCE" | "DELIVERY" | "ROUTE" | "DRIVER" | "LEGACY";
type TicketStatus = "OPEN" | "CLOSED";
type TicketOutcome = "RESOLVED" | "APPROVED" | "DENIED" | "MIGRATED";
type TicketCloseOutcome = Exclude<TicketOutcome, "MIGRATED">;
type TicketAuthorizationStatus =
  "NOT_REQUIRED" | "PENDING" | "APPROVED" | "DENIED" | "SUPERSEDED";

/** A support ticket as the API presents it (design §4.1). */
interface TicketSummary {
  id: string;
  number: number;
  kind: TicketKind;
  status: TicketStatus;
  subject: string;
  version: number;
  threadId: string;
  driver: ChatPerson;
  delivery: { id: string; recipient_name: string; status: string } | null;
  route: ChatRouteTag | null;
  occurrence: {
    id: string;
    typeName: string;
    authorization_status: TicketAuthorizationStatus;
    escalates_at: string | null;
  } | null;
  assignee: ChatPerson | null;
  waitingOn: "STAFF" | "DRIVER" | null;
  opened_via: string;
  openedBy: ChatPerson | null;
  closedBy: ChatPerson | null;
  closed_at: string | null;
  close_outcome: TicketOutcome | null;
  close_note: string | null;
  closeOutcomes: TicketCloseOutcome[];
  last_message_at: string | null;
  lastMessage: {
    kind: ChatMessageKind;
    preview: string | null;
    sender: ChatPerson;
  } | null;
  unreadCount: number;
  created_at: string;
}

/** The counts behind the balloon, the tab badge and the filters. */
interface TicketCounts {
  open: number;
  unassigned: number;
  mine: number;
  pendingAuthorization: number;
  unreadOpen: number;
}

interface TicketPermissions {
  canWrite: boolean;
  canAssign: boolean;
  canClose: boolean;
  canReopen: boolean;
  canDecide: boolean;
  closeOutcomes: TicketCloseOutcome[];
}

interface TicketOccurrenceDetail {
  id: string;
  typeName: string;
  description: string | null;
  photos: string[];
  receipt_photo_url: string | null;
  answers: Array<{ label: string; value: string }>;
  reportedBy: ChatPerson;
  occurred_at: string | null;
  created_at: string;
  authorization_status: TicketAuthorizationStatus;
  authorizedBy: ChatPerson | null;
  authorized_at: string | null;
  authorization_note: string | null;
  escalated_at: string | null;
  blocks_delivery: boolean;
}

interface TicketDetail extends TicketSummary {
  occurrenceDetail: TicketOccurrenceDetail | null;
  permissions: TicketPermissions;
}

type TicketEventType =
  | "OPENED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "CLOSED"
  | "REOPENED"
  | "OCCURRENCE_LINKED"
  | "AUTHORIZATION_DECIDED"
  | "AUTHORIZATION_SUPERSEDED";

interface TicketEvent {
  id: string;
  ticketId: string;
  type: TicketEventType;
  actor_kind: "USER" | "DRIVER_APP" | "SYSTEM";
  actorId: string | null;
  actor_name: string | null;
  target_user_id: string | null;
  target_user_name: string | null;
  outcome: TicketOutcome | null;
  note: string | null;
  created_at: string;
}

/** The `supportTicket` socket event the tower hears. */
interface SupportTicketRealtimeEvent {
  type:
    | "ticket.opened"
    | "ticket.assigned"
    | "ticket.closed"
    | "ticket.reopened"
    | "ticket.linked"
    | "ticket.authorization_changed";
  ticket: Omit<TicketSummary, "unreadCount">;
  actor: ChatPerson | null;
  alert?: {
    reason: "AUTHORIZATION" | "OCCURRENCE" | "DRIVER_OPENED";
    occurrenceTypeName?: string;
    recipientName?: string;
    driverName: string;
  };
}

/** The ticket a sent or arriving message belongs to. */
interface ChatMessageTicketRef {
  id: string;
  number: number;
  status: TicketStatus;
  assigneeId: string | null;
  version: number;
}

export type {
  TicketKind,
  TicketStatus,
  TicketOutcome,
  TicketCloseOutcome,
  TicketAuthorizationStatus,
  TicketSummary,
  TicketCounts,
  TicketPermissions,
  TicketOccurrenceDetail,
  TicketDetail,
  TicketEventType,
  TicketEvent,
  SupportTicketRealtimeEvent,
  ChatMessageTicketRef,
};
