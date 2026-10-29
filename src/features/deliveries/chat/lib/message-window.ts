/**
 * The window rules for a conversation that is no longer anchored to its end.
 *
 * Opening a search hit centres the list on one message, which means the list
 * stops being "the last N messages" and becomes a slice with two open ends.
 * Everything about that slice — which way each page extends it, which cursor
 * a page is allowed to move, and whether a message arriving live belongs in
 * it at all — is decided here, in plain functions over plain data.
 *
 * Pure: no React, no fetching, no clock.
 */

/** The exclusive (created_at, id) pair the API pages with. */
interface ChatCursor {
  created_at: string;
  id: string;
}

/** A page exactly as `list-messages` answers it: newest first. */
interface ChatMessagePage {
  data: Array<{ id: string }>;
  nextCursor: ChatCursor | null;
  previousCursor: ChatCursor | null;
  hasNewer: boolean;
}

/**
 * Where the loaded window ends on both sides.
 *
 * `hasNewer` is the important one: it is the difference between "this is the
 * conversation" and "this is a slice of it", and every decision that must
 * not lie to the reader — appending a live message, advancing the read
 * cursor, offering the way back to the end — reads it.
 *
 * `isResolved` is what keeps `hasNewer` honest. A window nobody has answered
 * for yet has no `hasNewer` to give, and `false` is not a neutral stand-in
 * for that: it reads as "the end of the conversation is on screen", which is
 * the one claim a window with nothing on screen must never make.
 */
interface ChatWindowEdges {
  /**
   * Whether a page has actually defined this window.
   *
   * False means "nobody has answered yet" — the opening load is still in
   * the air, or it failed. It is NOT "the window is at the end", and the two
   * used to be the same value: a message arriving while the opening fetch
   * was on the wire was appended to a list nobody had drawn, and the read
   * cursor was stamped over it.
   */
  isResolved: boolean;

  /** Towards the past. Null when the first message is on screen. */
  olderCursor: ChatCursor | null;

  /** Towards the present. Null when the last message is on screen. */
  newerCursor: ChatCursor | null;

  /** True while the end of the conversation is NOT part of this window. */
  hasNewer: boolean;
}

/**
 * A conversation nobody has answered for, and the shape a reset goes back to.
 *
 * It used to be called CLOSED_WINDOW_EDGES and to mean two different things
 * — "I do not know yet" and "I am at the end" — which is how an opening
 * load, and every failure of one, could be mistaken for a conversation
 * showing its newest message.
 */
const UNRESOLVED_WINDOW_EDGES: ChatWindowEdges = {
  isResolved: false,
  olderCursor: null,
  newerCursor: null,
  hasNewer: false,
};

/** The API answers newest-first; the screen reads oldest-first. */
function toAscending<T>(page: { data: T[] }): T[] {
  return [...page.data].reverse();
}

/** The edges a fresh page defines on its own — an opening load. */
function edgesFromPage(page: ChatMessagePage): ChatWindowEdges {
  return {
    // A page is exactly what resolves a window: from here on `hasNewer`
    // means something and may be believed.
    isResolved: true,
    olderCursor: page.nextCursor,
    newerCursor: page.previousCursor,
    hasNewer: page.hasNewer,
  };
}

/**
 * The edges after "Mensagens anteriores".
 *
 * Only the past-facing cursor moves. A page walked backwards answers
 * `previousCursor: null` and `hasNewer: false` because from where IT stands
 * there is nothing newer to report — copying those in would tell a window
 * centred in the middle of last March that it was showing today, and the way
 * back to the end would vanish from under the reader.
 */
function edgesAfterOlderPage(
  edges: ChatWindowEdges,
  page: ChatMessagePage,
): ChatWindowEdges {
  return { ...edges, olderCursor: page.nextCursor };
}

/**
 * The edges after "Mensagens mais recentes".
 *
 * The mirror image, and the same trap the other way round: a page walked
 * forwards answers `nextCursor: null`, which is not "there is no more
 * history" but "this page was not asked about history". The window keeps the
 * past-facing cursor it already had.
 */
function edgesAfterNewerPage(
  edges: ChatWindowEdges,
  page: ChatMessagePage,
): ChatWindowEdges {
  return {
    isResolved: true,
    olderCursor: edges.olderCursor,
    newerCursor: page.previousCursor,
    hasNewer: page.hasNewer,
  };
}

/**
 * Whether the end of the conversation is loaded.
 *
 * The one question behind "may a live message be appended", "may the read
 * cursor advance" and "does the way back to the end need to be offered".
 *
 * A window nobody has answered for is not at the end — it is nowhere. That
 * clause is the whole of the difference: without it a pane still waiting for
 * its opening page, or one whose opening page failed outright, claimed to be
 * showing the newest message of the conversation and marked the thread read
 * over messages it had never drawn.
 */
function isAnchoredAtEnd(edges: ChatWindowEdges): boolean {
  return edges.isResolved && !edges.hasNewer;
}

/**
 * Whether a message arriving over the socket belongs at the bottom of what
 * is on screen.
 *
 * It never does while the window sits in the past: the message belongs to
 * the end of the conversation, and the end is not loaded. Appending it would
 * draw it directly under a message from months earlier — a continuity the
 * conversation does not have — and shove the reader off the message they
 * came here to read.
 */
function canAppendLiveMessage(edges: ChatWindowEdges): boolean {
  return isAnchoredAtEnd(edges);
}

/** The ones not already on screen, in the order they came. */
function withoutKnown<T extends { id: string }>(
  incoming: T[],
  known: Array<{ id: string }>,
): T[] {
  if (known.length === 0) return incoming;

  const seen = new Set(known.map((message) => message.id));

  return incoming.filter((message) => !seen.has(message.id));
}

/**
 * A page of history in front of what is on screen.
 *
 * The overlap guard is not paranoia: the cursor is exclusive, but a message
 * sent while the page was in flight can land in both halves, and the same
 * message twice in a conversation is the kind of bug nobody reports and
 * everybody notices.
 */
function prependOlder<T extends { id: string }>(current: T[], older: T[]): T[] {
  return [...withoutKnown(older, current), ...current];
}

/** A page walked towards the present, behind what is on screen. */
function appendNewer<T extends { id: string }>(current: T[], newer: T[]): T[] {
  return [...current, ...withoutKnown(newer, current)];
}

/**
 * What identifies a message: the server id, or the one this browser gave it.
 */
interface IdentifiableChatMessage {
  id: string;

  /** Null for anything this browser did not send itself. */
  client_submission_id?: string | null;
}

/**
 * The ones this browser is still sending that the server has already
 * confirmed somewhere in the list.
 *
 * `withoutKnown` cannot see these: an optimistic message carries a local id
 * (`local-<uuid>`) and its confirmed twin carries the server id, so BY ID
 * they are two different messages. The identity that matches across the wire
 * is the submission id — the same one that makes a retry idempotent.
 */
function withoutAlreadySent<T extends IdentifiableChatMessage>(
  stillSending: T[],
  landed: IdentifiableChatMessage[],
): T[] {
  const submitted = new Set(
    landed
      .map((message) => message.client_submission_id)
      .filter((id): id is string => Boolean(id)),
  );

  if (submitted.size === 0) return stillSending;

  return stillSending.filter(
    (message) =>
      !message.client_submission_id ||
      !submitted.has(message.client_submission_id),
  );
}

/**
 * The list to show when a window that was in the past comes back to the end.
 *
 * Three sources, in the only order that tells the truth:
 *
 * - the page the server has just answered, which IS the end of the
 *   conversation;
 * - what arrived over the socket while the window was detached and was held
 *   instead of dropped: it reached this browser after the server built that
 *   page, so it belongs behind it — and it is dropped right here when the
 *   page turns out to carry it already;
 * - our own sends still on the wire, which have no server id, no place other
 *   than the very end, and must survive a jump nobody asked them to make.
 *
 * The third source is deduplicated against the first two by submission id
 * and not by id: a send that landed while the page was being built comes
 * back carrying the server id, and matching on that would draw the same
 * photo twice — once confirmed, once eternally pending.
 */
function mergeBackAtEnd<T extends IdentifiableChatMessage>(
  page: T[],
  held: T[],
  stillSending: T[],
): T[] {
  const landed = appendNewer(page, held);

  return [...landed, ...withoutAlreadySent(stillSending, landed)];
}

/** What the read cursor needs of a message: when, and whether it is real. */
interface ReadableChatMessage {
  created_at: string;
  pending?: boolean;
  failed?: boolean;
}

/**
 * How far the read cursor may reach: the stamp of the newest message the
 * reader actually has in front of them.
 *
 * Null when there is nothing to report — a conversation with no messages, or
 * one whose only messages are still on the wire. The caller then says
 * nothing and lets the server use its own clock, which covers nothing that
 * is not already covered.
 *
 * Optimistic sends are skipped on purpose: their stamp is this browser's
 * clock, so reporting one is `Date.now()` wearing a message's clothes — and
 * "now" is exactly the value that covers a message which arrived while the
 * window was in the past and was never drawn.
 *
 * A scan and not "the last one": the array is kept in reading order, but a
 * page walked forward, a live arrival and a held batch all write into it,
 * and what this has to guarantee is the maximum — not the last element.
 */
function newestReadStamp(messages: ReadableChatMessage[]): string | null {
  let newest: string | null = null;

  for (const message of messages) {
    if (message.pending || message.failed) continue;

    if (newest === null || new Date(message.created_at) > new Date(newest)) {
      newest = message.created_at;
    }
  }

  return newest;
}

export {
  UNRESOLVED_WINDOW_EDGES,
  toAscending,
  edgesFromPage,
  edgesAfterOlderPage,
  edgesAfterNewerPage,
  isAnchoredAtEnd,
  canAppendLiveMessage,
  withoutKnown,
  withoutAlreadySent,
  prependOlder,
  appendNewer,
  mergeBackAtEnd,
  newestReadStamp,
};

export type {
  ChatCursor,
  ChatMessagePage,
  ChatWindowEdges,
  IdentifiableChatMessage,
  ReadableChatMessage,
};
