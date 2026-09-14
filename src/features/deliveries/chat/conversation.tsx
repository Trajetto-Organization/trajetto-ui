"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery, useQueryClient } from "react-query";
import { toast } from "sonner";

import {
  ArrowLeft,
  ChevronDown,
  ChevronsDown,
  ChevronUp,
  Loader,
  MessageCircle,
  RefreshCw,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import { getSocket, initializeSocket } from "@/socket";

import {
  listChatMessages,
  type ListChatMessagesData,
} from "@/actions/chat/list-chat-messages";
import { sendChatMessage } from "@/actions/chat/send-chat-message";
import { markChatRead } from "@/actions/chat/mark-chat-read";
import { getChatAttachmentUrl } from "@/actions/chat/get-chat-attachment-url";

import type {
  ActionResponse,
  ChatDeliveredEvent,
  ChatDriverUser,
  ChatMessage,
  SentChatMessage,
} from "@/actions/chat/chat.types";
import { usePhotoUpload } from "@/hooks/use-photo-upload";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { DeliveryDetailDialog } from "../deliveries/detail-dialog";

import { MessageBubble } from "./message-bubble";
import { ImageAlbumBubble } from "./image-album-bubble";
import { ChatImageViewer } from "./image-viewer";
import { TypingBubble } from "./typing-bubble";
import { RecordingBubble } from "./recording-bubble";
import { ChatComposer, type ComposerSubmission } from "./composer";
import { ReadOnlyNotice } from "./read-only-notice";

import {
  useChatRecordingPulse,
  useChatTypingEmitter,
} from "./lib/use-chat-socket";

import { activeChatHint, chatHintLabel } from "./lib/chat-hints";
import { useDeliveryReceipt } from "./lib/use-delivery-receipt";

import { groupChatMessages } from "./lib/group-messages";

import {
  appendNewer,
  canAppendLiveMessage,
  edgesAfterNewerPage,
  edgesAfterOlderPage,
  edgesFromPage,
  isAnchoredAtEnd,
  mergeBackAtEnd,
  newestReadStamp,
  prependOlder,
  toAscending,
  UNRESOLVED_WINDOW_EDGES,
  withoutKnown,
  type ChatWindowEdges,
} from "./lib/message-window";

import {
  settleWindowLoad,
  type WindowLoadOutcome,
} from "./lib/window-load";

import { buildImageGallery, galleryKeyOf } from "./lib/image-gallery";

import {
  formatDaySeparator,
  formatInitials,
  formatLastSeen,
  isSameDay,
} from "./lib/format";

import type {
  ChatDeliveryChip,
  ChatFocusRequest,
  ChatTarget,
  ClientChatMessage,
} from "./lib/types";

/**
 * How long a jumped-to message stays lit.
 *
 * Long enough to find it after the scroll settles, short enough that the
 * highlight never becomes part of how the conversation looks.
 */
const FOCUS_HIGHLIGHT_MS = 2_600;

/**
 * The query key the "Revalidar Dados" button reaches this pane through.
 *
 * `query-keys-mapping` maps the chat's tag onto it, and the shared refresh
 * hook invalidates whatever a tag maps to — so nothing new had to be
 * invented to give the button an effect here.
 */
const CHAT_CONVERSATION_QUERY_KEY = "chat-conversation";

/**
 * What a load that failed without a sentence of its own is shown as.
 *
 * A window load can now fail in ways the action never gets to describe — the
 * server action itself failing in transport, above all — and a load that
 * fails silently is the whole of what went wrong here before.
 */
const WINDOW_LOAD_FALLBACK_MESSAGE =
  "Não foi possível carregar a conversa. Verifique a conexão e tente de novo.";

/**
 * A number that is different every time it is asked for.
 *
 * The refresh entry carries no data of its own — the conversation is a
 * window with two cursors and a live socket, which no cache key describes —
 * so what it answers only has to be recognisably NEW. A clock would not do:
 * two refreshes inside the same millisecond would read as one.
 */
let refreshTicket = 0;

const nextRefreshTicket = (): number => {
  refreshTicket += 1;

  return refreshTicket;
};

/** Client-only extra: the picked file rides along so a retry can re-upload. */
type OutgoingMessage = ClientChatMessage & { localFile?: File };

/**
 * The stamp to report out of a batch the server just handed us: the newest
 * message written by the driver. Anything of our own — confirmed or still
 * optimistic — would push the cursor past messages that never arrived.
 *
 * The driver's user id is an argument and not a closure on purpose: the
 * answer that carries a batch is the same answer that says who the driver
 * is, and reading a stale id here would silently skip the receipt.
 */
const findDriverStamp = (
  batch: ChatMessage[],
  driverUserId: string | null,
): string | null => {
  if (!driverUserId) return null;

  let newest: string | null = null;

  for (const message of batch) {
    if (message.senderId !== driverUserId) continue;

    if (newest === null || new Date(message.created_at) > new Date(newest)) {
      newest = message.created_at;
    }
  }

  return newest;
};

interface ConversationProps {
  /** Only the MASTER passes it; it rides into every chat action. */
  actionBusinessId?: string;

  target: ChatTarget;
  presence: { online: boolean; lastSeenAt: string | null } | null;

  isDriverTyping: boolean;

  /** True while the driver holds the microphone open on his side. */
  isDriverRecording: boolean;

  myUserId: string | null;

  canWrite: boolean;

  /** Support view: reads the whole history, writes nothing, marks nothing. */
  isReadOnly: boolean;

  initialDeliveryChip: ChatDeliveryChip | null;

  /**
   * The search hit to open on, when the reader came from one. Null is the
   * ordinary case: the conversation opens at its end.
   */
  focusRequest: ChatFocusRequest | null;

  onBack: () => void;
  onThreadResolved: (driverId: string, threadId: string) => void;
}

const Conversation = ({
  actionBusinessId,
  target,
  presence,
  isDriverTyping,
  isDriverRecording,
  myUserId,
  canWrite,
  isReadOnly,
  initialDeliveryChip,
  focusRequest,
  onBack,
  onThreadResolved,
}: ConversationProps): JSX.Element => {
  const queryClient = useQueryClient();

  // Uploads and the delivery dialog need a concrete company id; this hook
  // resolves it for both dashboard and admin modes.
  const concreteBusinessId = useDeliveriesBusinessId();

  const { uploadPhotos } = usePhotoUpload();

  const [messages, setMessages] = useState<OutgoingMessage[]>([]);

  /**
   * Where the loaded slice ends on each side.
   *
   * One piece of state and not three, because the three answers are only
   * ever correct together: a page moves one cursor and says nothing about
   * the other, and the rules for which is which live in `message-window`.
   */
  const [windowEdges, setWindowEdges] = useState<ChatWindowEdges>(
    UNRESOLVED_WINDOW_EDGES,
  );

  const [counterpartReadAt, setCounterpartReadAt] = useState<string | null>(
    null,
  );

  const [counterpartDeliveredAt, setCounterpartDeliveredAt] = useState<
    string | null
  >(null);

  /**
   * The driver's app account, as the conversation's own answer says it is.
   *
   * `undefined` is "not known yet", `null` is "he really has no app access".
   * The thread list only ever knows the drivers it happens to be showing —
   * it is paginated and filtered by the search box — so a null coming from
   * there is a guess and is treated as unknown until the API answers.
   */
  const [driverUser, setDriverUser] = useState<
    ChatDriverUser | null | undefined
  >(target.driverUser ?? undefined);

  const driverUserId = driverUser?.id ?? null;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [isLoadingNewer, setIsLoadingNewer] = useState<boolean>(false);
  const [isJumpingToEnd, setIsJumpingToEnd] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");

  /**
   * How many times the reader has asked this conversation to open again.
   *
   * The opening load is an effect, and an effect is re-run by its
   * dependencies — so this number is the retry button, and the way the
   * refresh signal reaches a conversation that never opened at all.
   */
  const [reloadTicket, setReloadTicket] = useState<number>(0);

  /** The jumped-to message, while its highlight is still up. */
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null,
  );

  /**
   * How many live arrivals the pane is holding for the way back.
   *
   * The messages themselves live in a ref (`heldLiveRef`) because the flush
   * runs in the same tick as the page that triggers it; this is only the
   * number the dot renders from. Never a boolean again: a boolean can be
   * cleared by a jump whose page did not actually contain the message, which
   * is how an arrival ended up discarded AND marked as read.
   */
  const [heldLiveCount, setHeldLiveCount] = useState<number>(0);

  /**
   * The photo the viewer is open over, by gallery key — never by index.
   *
   * The list moves underneath an open viewer (a socket message appends,
   * "Mensagens anteriores" prepends a whole page), so the position is derived
   * from this identity on every render instead of being stored.
   */
  const [galleryAnchor, setGalleryAnchor] = useState<string | null>(null);

  const [detailDeliveryId, setDetailDeliveryId] = useState<string | null>(null);

  const [deliveryChip, setDeliveryChip] = useState<ChatDeliveryChip | null>(
    initialDeliveryChip,
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef<boolean>(true);

  // Refs mirror the state the socket handlers need: the listeners are bound
  // once per target and must always see current values.
  const threadIdRef = useRef<string | null>(target.threadId);

  /**
   * The list and the window, as they are RIGHT NOW.
   *
   * The refs are the truth and the state is how the truth is drawn: every
   * write goes through `commitMessages` / `commitWindowEdges`, which set the
   * ref before the state. They used to be mirrored from an effect, one
   * commit behind, and everything that has to decide in the same tick as a
   * write read the stale copy — whether a live message may be appended,
   * where the read cursor is allowed to reach, which page still belongs to
   * the window on screen.
   */
  const messagesRef = useRef<OutgoingMessage[]>([]);
  const windowEdgesRef = useRef<ChatWindowEdges>(UNRESOLVED_WINDOW_EDGES);

  /**
   * The standing load error, readable in the same tick it is written.
   *
   * The refresh signal decides between retrying the opening load and jumping
   * to the end, and it has to know which of the two the panel is in without
   * waiting for a render.
   */
  const loadErrorRef = useRef<string>("");

  /**
   * Which window the pane is showing, as a number that only ever grows.
   *
   * Every load carries the generation it was asked in, and an answer from a
   * generation that is no longer current is dropped on the floor. Without it
   * a page from the window the reader has already left is spliced into the
   * one they are in — `prependOlder`/`appendNewer` deduplicate by id and
   * have no way to notice that February does not belong under September.
   *
   * Bumped by whatever REPLACES the window: opening the conversation, a
   * search hit re-centring it, the jump back to the end. Walking either side
   * only extends the window it was asked in, so it keeps the same number.
   */
  const windowGenerationRef = useRef<number>(0);

  /**
   * How many of the three loaders are on the wire.
   *
   * A ref and not the three booleans that render the spinners: two clicks
   * inside one tick both read state that has not committed, so the buttons
   * being disabled is a drawing, not a lock.
   *
   * A count and not a flag because a request can be superseded and still has
   * to be accounted for: whoever raised it lowers it, exactly once, whatever
   * the answer turns out to be worth.
   */
  const inFlightLoadsRef = useRef<number>(0);

  // The guard against a second jump, in a ref because sending checks it in
  // the same tick it is set: the state has not committed yet.
  const isJumpingToEndRef = useRef<boolean>(false);

  /**
   * Live arrivals kept aside while the window sits in the past.
   *
   * They cannot be appended — the end of the conversation is not loaded and
   * drawing them under a message from March would invent a continuity the
   * conversation does not have — but they have arrived, and a message that
   * arrives may not simply cease to exist. They wait here and are poured
   * back in by whatever brings the window home.
   */
  const heldLiveRef = useRef<OutgoingMessage[]>([]);

  // A message that landed with the tab in the background still has to be
  // marked read when the reader actually comes back to it.
  const pendingReadRef = useRef<boolean>(false);

  /**
   * The `blob:` URLs handed to optimistic photos, by submission id.
   *
   * `URL.createObjectURL` pins the whole `File` in the tab's memory until it
   * is revoked, and nothing else ever revokes these: a ten-photo batch is
   * some forty megabytes that switching driver does not give back and that
   * only a full reload clears. The composer revokes its own previews, but
   * those are different URLs made from the same `File`.
   */
  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  /** Gives one optimistic photo's `blob:` back, once its file is not shown. */
  const releaseObjectUrl = useCallback((submissionId: string | null) => {
    if (!submissionId) return;

    const url = objectUrlsRef.current.get(submissionId);

    if (!url) return;

    objectUrlsRef.current.delete(submissionId);
    URL.revokeObjectURL(url);
  }, []);

  const releaseAllObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  /**
   * Gives back every optimistic `blob:` EXCEPT the ones still being sent.
   *
   * Replacing the window used to revoke all of them, previews of photos
   * still on the wire included: the bubbles went blank, and when the upload
   * of photo 2 failed there was no bubble left for `markAsFailed` to find —
   * no failure, no retry button, the photo simply gone.
   */
  const releaseObjectUrlsExcept = useCallback((kept: OutgoingMessage[]) => {
    const keep = new Set(
      kept
        .map((message) => message.client_submission_id)
        .filter((id): id is string => Boolean(id)),
    );

    objectUrlsRef.current.forEach((url, submissionId) => {
      if (keep.has(submissionId)) return;

      objectUrlsRef.current.delete(submissionId);
      URL.revokeObjectURL(url);
    });
  }, []);

  /**
   * The pane going away is the one case nothing else covers.
   *
   * Its own effect rather than the opening load's cleanup, because that
   * cleanup also runs whenever the window is merely REPLACED — and a
   * re-centring is not a reason to revoke the preview of a photo that is
   * still uploading.
   */
  useEffect(() => () => releaseAllObjectUrls(), [releaseAllObjectUrls]);

  /**
   * Writes the list: the ref first, the state after, in one tick.
   *
   * Returns what it wrote, so a caller that has just rebuilt the window can
   * ask the very same list how far the read cursor may go.
   */
  const commitMessages = useCallback(
    (
      update: (current: OutgoingMessage[]) => OutgoingMessage[],
    ): OutgoingMessage[] => {
      const next = update(messagesRef.current);

      messagesRef.current = next;
      setMessages(next);

      return next;
    },
    [],
  );

  /** The same contract for the edges — see `messagesRef` for why. */
  const commitWindowEdges = useCallback(
    (update: (current: ChatWindowEdges) => ChatWindowEdges): ChatWindowEdges => {
      const next = update(windowEdgesRef.current);

      windowEdgesRef.current = next;
      setWindowEdges(next);

      return next;
    },
    [],
  );

  /**
   * The same ref-first contract as the list and the edges — see
   * `messagesRef` for why anything read inside one tick lives in a ref.
   */
  const commitLoadError = useCallback((message: string) => {
    loadErrorRef.current = message;
    setLoadError(message);
  }, []);

  /** Asks the conversation to open again, from the top. */
  const reloadConversation = useCallback(() => {
    setReloadTicket((ticket) => ticket + 1);
  }, []);

  /**
   * Runs one load of the window with the accounting that has to survive
   * anything at all.
   *
   * The in-flight counter IS the mutual exclusion between the three ways of
   * walking the window, and the spinner state is only its drawing. Both used
   * to be given back on the line after the await, in straight-line code —
   * and `listChatMessages` could REJECT rather than answer, because it read
   * its cookie outside its own try. One flaky fetch therefore left the
   * counter above zero for good and every button disabled with it, "Ir para
   * a última mensagem" included: the only way back to the arrivals the pane
   * was holding, with the dot still lit over content nothing could show.
   *
   * The `finally` is the whole point. `settleWindowLoad` already promises
   * not to throw, and the release still does not depend on that promise.
   */
  const runWindowLoad = useCallback(
    async (
      setBusy: (busy: boolean) => void,
      request: () => Promise<ActionResponse<ListChatMessagesData>>,
    ): Promise<WindowLoadOutcome<ListChatMessagesData>> => {
      inFlightLoadsRef.current += 1;
      setBusy(true);

      try {
        return await settleWindowLoad(request, WINDOW_LOAD_FALLBACK_MESSAGE);
      } finally {
        inFlightLoadsRef.current -= 1;
        setBusy(false);
      }
    },
    [],
  );

  /** Puts an arrival aside, without letting the same one in twice. */
  const holdLiveArrival = useCallback((message: OutgoingMessage) => {
    heldLiveRef.current = appendNewer(heldLiveRef.current, [message]);

    setHeldLiveCount(heldLiveRef.current.length);
  }, []);

  /**
   * Drops from the buffer whatever the screen has caught up with.
   *
   * A page walked forward, or a window re-centred nearer the present, can
   * legitimately contain a message that ALSO arrived over the socket and was
   * put aside. The dot counts what the reader cannot see; leaving it
   * counting a message they are looking at invites them to jump away from
   * the very thing it is pointing at.
   */
  const dropHeldAlreadyOnScreen = useCallback(
    (rendered: OutgoingMessage[]) => {
      const held = heldLiveRef.current;

      if (held.length === 0) return;

      const remaining = withoutKnown(held, rendered);

      if (remaining.length === held.length) return;

      heldLiveRef.current = remaining;
      setHeldLiveCount(remaining.length);
    },
    [],
  );

  /** Hands the held arrivals over and empties the buffer in one move. */
  const takeHeldLive = useCallback((): OutgoingMessage[] => {
    const held = heldLiveRef.current;

    if (held.length === 0) return held;

    heldLiveRef.current = [];
    setHeldLiveCount(0);

    return held;
  }, []);

  // The highlight puts itself out; nothing has to be clicked to dismiss it.
  useEffect(() => {
    if (!highlightMessageId) return;

    const timer = setTimeout(
      () => setHighlightMessageId(null),
      FOCUS_HIGHLIGHT_MS,
    );

    return () => clearTimeout(timer);
  }, [highlightMessageId]);

  // Photos sent in one go read as one album, not as five stacked bubbles.
  const groups = useMemo(() => groupChatMessages(messages), [messages]);

  /**
   * The gallery is the same `messages` list, filtered — not the groups.
   *
   * Grouping only collapses runs of photos for presentation and never
   * reorders anything, so reading it here would buy nothing and would tie the
   * viewer's order to a rule that exists for bubbles. Built only while the
   * viewer is open: with it closed this is a socket event's worth of work per
   * message, for nobody.
   */
  const galleryPhotos = useMemo(
    () => (galleryAnchor ? buildImageGallery(messages) : []),
    [galleryAnchor, messages],
  );

  const handleOpenImage = useCallback((message: ClientChatMessage) => {
    setGalleryAnchor(galleryKeyOf(message));
  }, []);

  const handleCloseGallery = useCallback(() => setGalleryAnchor(null), []);

  /**
   * Renews ONE photo's expired link and writes it into the message.
   *
   * The viewer owns the retry button but not the message list, so it asks and
   * this answers. Reloading the conversation — the only renewal there used to
   * be — replaces the list with the newest page, drops the photo the gallery
   * is anchored to and closes the dialog on top of the reader; renewing one
   * message disturbs nothing.
   *
   * An optimistic photo has no server id and no signature to renew: it is a
   * local file, and the attempt bump inside the viewer is all a retry can do
   * for it.
   */
  const handleRenewPhoto = useCallback(
    async (messageId: string): Promise<string | null> => {
      const result = await getChatAttachmentUrl({
        messageId,
        businessId: actionBusinessId,
      });

      const renewed = result.success ? (result.data?.attachment_url ?? null) : null;

      if (!renewed) return null;

      // The bubble in the thread carries the same expired link, so the patch
      // is worth making even though only the viewer asked for it.
      commitMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, attachment_url: renewed }
            : message,
        ),
      );

      return renewed;
    },
    [actionBusinessId],
  );

  const isNearBottom = () => {
    const node = scrollRef.current;

    if (!node) return true;

    return node.scrollHeight - node.scrollTop - node.clientHeight < 120;
  };

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const node = scrollRef.current;

      if (node) node.scrollTop = node.scrollHeight;
    });
  }, []);

  /**
   * Puts one message in the middle of the pane.
   *
   * Twice, because the first pass runs before the photos of the window have
   * any height: a run of albums above the target grows as it decodes and
   * carries the message off the screen the reader was just given. The second
   * pass lands after that settling, the same way the typing bubble's does.
   */
  const scrollToMessage = useCallback((messageId: string) => {
    const centre = () => {
      const node = scrollRef.current?.querySelector<HTMLElement>(
        `[data-chat-messages~="${messageId}"]`,
      );

      node?.scrollIntoView({ block: "center" });
    };

    requestAnimationFrame(centre);

    // No cleanup to hand back and none needed: the pane going away leaves
    // the ref null, and the second pass then does nothing at all.
    setTimeout(centre, 260);
  }, []);

  /**
   * Advances the read cursor, and never past what is on screen.
   *
   * `readAt` is the whole point: the cursor covers a thread up to a moment
   * in time, so a cursor stamped with the server's clock covers everything
   * written up to now — a message that arrived thirty milliseconds after the
   * page was built included. The stamp reported here is a message the reader
   * really has in front of them, never `Date.now()` and never the edge of
   * the window the panel asked the server for.
   */
  const readThread = useCallback(
    async (threadId: string, readAt: string | null) => {
      // Support never advances the cursor: the driver would see the double
      // check without anyone at the company having read him.
      if (isReadOnly) return;

      const result = await markChatRead({
        threadId,
        businessId: actionBusinessId,
        readAt: readAt ?? undefined,
      });

      // The badge in the list derives from the cursor just advanced.
      if (result.success) {
        queryClient.invalidateQueries(["chat-threads"]);
      }
    },
    [actionBusinessId, isReadOnly, queryClient],
  );

  /**
   * Reads the thread up to the newest message actually rendered.
   *
   * Reading the ref is sound precisely because every write to the list goes
   * through `commitMessages`: the page that triggered this is already in
   * there, and nothing that is not in there is claimed.
   */
  const readUpToWhatIsRendered = useCallback(
    (threadId: string) => {
      void readThread(threadId, newestReadStamp(messagesRef.current));
    },
    [readThread],
  );

  /**
   * Marks the thread read, but only from a window that has the end in it.
   *
   * The counterpart of the rule in the opening load, and the reason it is a
   * function of the edges rather than of the state: the caller has just
   * computed the new edges and the state carrying them has not committed.
   */
  const settleReadIfAtEnd = useCallback(
    (edges: ChatWindowEdges) => {
      const threadId = threadIdRef.current;

      if (!threadId || !isAnchoredAtEnd(edges)) return;

      readUpToWhatIsRendered(threadId);
    },
    [readUpToWhatIsRendered],
  );

  // "digitando..." on the driver's phone while the agent writes. Silent for
  // support and for drivers without an app account.
  const emitTyping = useChatTypingEmitter(driverUserId, !isReadOnly);

  // "gravando áudio..." on the same screen, under the same rules. Its own
  // event because the two can be true at once here, and a pulse rather than
  // a pair of signals: the composer says whether the microphone is
  // capturing, and the hook keeps saying so until it stops.
  const reportRecordingCapture = useChatRecordingPulse(
    driverUserId,
    !isReadOnly,
  );

  // The team receipt: an open panel here is the company having received the
  // driver's message, whoever ends up reading it. Support is excluded — the
  // API answers 403 to a MASTER, and the panel does not knock.
  const reportDelivered = useDeliveryReceipt({
    enabled: !isReadOnly,
    businessId: actionBusinessId,
  });

  // ============================================== initial load per target
  useEffect(() => {
    let disposed = false;

    threadIdRef.current = target.threadId;

    // A window is being replaced, so everything asked for in the previous
    // one is now an answer about a conversation nobody is looking at.
    windowGenerationRef.current += 1;

    const generation = windowGenerationRef.current;

    /**
     * Our own sends still on the wire are not part of any window.
     *
     * They belong to the END of the conversation and to no page in
     * particular, and re-centring on a search hit is not a jump they asked
     * to make — `message-window` states the rule and the jump button already
     * honours it; this path used to hand `mergeBackAtEnd` an empty third
     * argument and throw them away. Three photos on a slow connection then
     * lost their bubbles, and when one upload failed `markAsFailed` mapped a
     * list that no longer held that submission id: no failure, no retry, the
     * photo dead in silence.
     */
    const carriedOverSends = messagesRef.current.filter(
      (message) => message.pending || message.failed,
    );

    // ...and their `blob:` previews are precisely the ones that may not be
    // revoked. Everything else in the map belongs to a message that is going
    // away with the window.
    releaseObjectUrlsExcept(carriedOverSends);

    commitMessages(() => carriedOverSends);
    commitWindowEdges(() => UNRESOLVED_WINDOW_EDGES);

    setCounterpartReadAt(null);
    setCounterpartDeliveredAt(null);

    commitLoadError("");

    setHighlightMessageId(null);

    // Another driver's conversation has none of this one's photos.
    setGalleryAnchor(null);

    setDeliveryChip(initialDeliveryChip);

    stickToBottomRef.current = true;
    pendingReadRef.current = false;

    setIsLoading(true);

    const focusMessageId = focusRequest?.messageId ?? null;

    /**
     * The conversation asks for itself.
     *
     * `threadId` when the list handed one over, the driver otherwise — and
     * the server resolves it either way. That is the whole fix: opening a
     * driver from a message-text hit, or from "Conversar" in the delivery
     * detail, arrives here with no thread id, and this used to render the
     * "say hello" empty state over a history that existed all along.
     *
     * `around` turns the same question into "and centre it on this one".
     */
    const askForTheConversation = async (): Promise<
      WindowLoadOutcome<ListChatMessagesData>
    > => {
      const centred = await settleWindowLoad(
        () =>
          listChatMessages({
            threadId: target.threadId ?? undefined,
            driverId: target.driverId,
            around: focusMessageId ?? undefined,
            businessId: actionBusinessId,
          }),
        WINDOW_LOAD_FALLBACK_MESSAGE,
      );

      if (centred.ok || !focusMessageId) return centred;

      /**
       * The anchor did not survive: the API answers 400 for a message that
       * belongs to another conversation, and a hit can simply be stale by
       * the time it is clicked.
       *
       * The conversation still opens — at its end, like any other. Refusing
       * to show a thread because one message could not be found would punish
       * the reader for an old search result.
       */
      return settleWindowLoad(
        () =>
          listChatMessages({
            threadId: target.threadId ?? undefined,
            driverId: target.driverId,
            businessId: actionBusinessId,
          }),
        WINDOW_LOAD_FALLBACK_MESSAGE,
      );
    };

    // `settleWindowLoad` is what makes this `.then` enough: the opening load
    // answers an outcome and never rejects, so the spinner below is released
    // on every path a failure can take.
    void askForTheConversation().then((outcome) => {
      if (disposed) return;

      // A second focus token re-ran this effect while the first request was
      // still out: the older answer describes a window nobody is in.
      if (windowGenerationRef.current !== generation) return;

      setIsLoading(false);

      /**
       * The window stays UNRESOLVED, and that is the fix.
       *
       * The edges used to be left reading as "anchored at the end" while the
       * panel showed nothing but this message: an arrival then saw
       * `hasNewer: false`, was appended to a list nobody had drawn, and
       * `readUpToWhatIsRendered` stamped the thread read over it. Behind an
       * error screen with no way out, the badge cleared itself.
       */
      if (!outcome.ok) {
        commitLoadError(outcome.message);
        return;
      }

      const page = outcome.page;

      // "No app access" is the answer's to give, not the thread list's.
      setDriverUser(page.driverUser);

      const resolvedThreadId = page.threadId;

      threadIdRef.current = resolvedThreadId;

      // A conversation opened without its id, and the server had one: the
      // list, the badge and the socket filter all want to know.
      if (resolvedThreadId && resolvedThreadId !== target.threadId) {
        onThreadResolved(target.driverId, resolvedThreadId);
      }

      const edges = edgesFromPage(page);

      /**
       * The held arrivals survive a re-centring.
       *
       * This effect runs again for a second search hit inside the SAME
       * conversation — the driver is the identity of the pane and a
       * different one remounts it outright — so what is being held belongs
       * to the thread that is being reloaded. It goes in when this page has
       * the end of the conversation in it, and waits for the way back when
       * it does not; dropping it because the reader clicked another hit
       * would be the same message vanishing all over again.
       */
      const held = isAnchoredAtEnd(edges) ? takeHeldLive() : [];

      /**
       * Read from the ref and not from `carriedOverSends`: a message can be
       * started from the composer while this very request is in flight, and
       * it belongs at the end exactly as much as the ones carried over.
       */
      const stillSending = messagesRef.current.filter(
        (message) => message.pending || message.failed,
      );

      const rendered = commitMessages(() =>
        mergeBackAtEnd(toAscending(page), held, stillSending),
      );

      commitWindowEdges(() => edges);

      // A window re-centred nearer the present can carry an arrival that is
      // still in the buffer; the dot must not count what is on screen.
      dropHeldAlreadyOnScreen(rendered);

      setCounterpartReadAt(page.counterpartLastReadAt);
      setCounterpartDeliveredAt(page.counterpartDeliveredAt);

      // A window centred on a hit lands ON the hit; anywhere else the
      // conversation opens where a conversation opens.
      const landedOnFocus =
        focusMessageId !== null &&
        page.data.some((message) => message.id === focusMessageId);

      if (landedOnFocus) {
        setHighlightMessageId(focusMessageId);
        scrollToMessage(focusMessageId);
      } else {
        scrollToBottom();
      }

      // Nothing to acknowledge in a conversation that has not started.
      if (!resolvedThreadId) return;

      /**
       * Read is only read while the end of the conversation is on screen.
       *
       * The cursor covers the WHOLE thread, so advancing it from a window
       * sitting in the middle of March would clear the badge over messages
       * nobody has laid eyes on: the driver would see the blue check and the
       * base would have lost the answer. Coming back to the end is what
       * marks it read, and there is a button for exactly that.
       */
      if (isAnchoredAtEnd(edges)) {
        readUpToWhatIsRendered(resolvedThreadId);
      }

      // Received, though, is honest either way: the browser is holding it.
      const stamp = findDriverStamp(page.data, page.driverUser?.id ?? null);

      if (stamp) reportDelivered(resolvedThreadId, stamp);
    });

    return () => {
      disposed = true;
    };
    // The driver is the identity of this pane — a thread id stitched in
    // later by the list is the same conversation this load already
    // resolved, and refetching on it would only double the request.
    // initialDeliveryChip intentionally only applies on target change.
    //
    // The focus token, on the other hand, IS a reload: a second search hit
    // inside the conversation already open has to re-centre it, and picking
    // the same driver from the thread list has to bring the end back.
    //
    // The reload ticket is the third: a conversation that failed to open has
    // no other way back, and the retry button is what bumps it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.driverId, actionBusinessId, focusRequest?.token, reloadTicket]);

  // ==================================================== realtime wiring
  useEffect(() => {
    let disposed = false;

    const handleChatMessage = (payload: SentChatMessage) => {
      if (disposed) return;

      const belongsHere =
        payload.threadId === threadIdRef.current ||
        payload.driver?.id === target.driverId;

      if (!belongsHere) return;

      // A first message (any side, any agent) materializes the thread.
      if (!threadIdRef.current && payload.threadId) {
        threadIdRef.current = payload.threadId;
        onThreadResolved(target.driverId, payload.threadId);
      }

      const alreadyThere = messagesRef.current.some(
        (message) =>
          message.id === payload.id ||
          (payload.client_submission_id !== null &&
            message.client_submission_id === payload.client_submission_id),
      );

      if (alreadyThere) return;

      /**
       * A message belongs at the bottom of the pane only when the bottom of
       * the pane IS the end of the conversation.
       *
       * While the window sits on a search hit from March, it is not: the
       * message would be drawn under one from months earlier as though the
       * two were consecutive, and the scroll would drag the reader off the
       * message they came here to read.
       */
      const isAtEnd = canAppendLiveMessage(windowEdgesRef.current);

      if (isAtEnd) {
        const shouldStick = isNearBottom();

        commitMessages((current) => [...current, payload]);

        if (shouldStick) scrollToBottom();
      } else {
        /**
         * Held, not dropped, and held whoever wrote it.
         *
         * It used to be thrown away with a boolean left behind, and the
         * boolean only ever lit for the driver: another agent of the same
         * company answering the thread, or a broadcast going out, left no
         * trace at all — and they are exactly as far outside this window as
         * the driver's message is. What the dot says is "the end of the
         * conversation is ahead of what you are reading", and that is true
         * of all three.
         */
        holdLiveArrival(payload);
      }

      // The driver wrote and the manager is looking: it is read. Behind
      // another window it is not — the cursor waits for the reader.
      if (payload.senderId === driverUserId && threadIdRef.current) {
        // Received is not read: the message reached this browser the moment
        // it arrived, tab focused or not, so the receipt goes out either way.
        const stamp = findDriverStamp([payload], driverUserId);

        if (stamp) reportDelivered(threadIdRef.current, stamp);

        // ...and read stays out of reach of a window in the past, for the
        // same reason the opening load does not mark one: nothing that
        // arrived is on screen anywhere.
        if (!isAtEnd) return;

        if (document.hasFocus()) {
          readUpToWhatIsRendered(threadIdRef.current);
        } else {
          pendingReadRef.current = true;
        }
      }
    };

    const handleChatRead = (event: {
      threadId: string;
      userId: string;
      last_read_at: string;
    }) => {
      if (disposed) return;
      if (event.threadId !== threadIdRef.current) return;

      // Only the driver's cursor turns this pane's checks double.
      if (event.userId !== driverUserId) return;

      setCounterpartReadAt((current) =>
        !current || new Date(event.last_read_at) > new Date(current)
          ? event.last_read_at
          : current,
      );
    };

    const handleChatDelivered = (event: ChatDeliveredEvent) => {
      if (disposed) return;

      if (event.threadId !== threadIdRef.current) return;

      // The API routes each receipt to the opposite counter, so only the
      // driver's ever reaches this pane. Checking anyway is one line and it
      // closes the door on the team's own cursor colouring its own checks.
      if (event.side !== "DRIVER") return;

      // Socket events can arrive out of order, so the cursor only moves
      // forward: a late receipt must never pull a check back a state.
      setCounterpartDeliveredAt((current) =>
        !current || new Date(event.delivered_at) > new Date(current)
          ? event.delivered_at
          : current,
      );
    };

    let boundSocket: ReturnType<typeof getSocket> = null;

    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        boundSocket = socket;

        socket.on("chatMessage", handleChatMessage);
        socket.on("chatRead", handleChatRead);
        socket.on("chatDelivered", handleChatDelivered);
      })
      .catch(() => {
        // Without realtime the panel still works: sends answer over HTTP
        // and the refresh button refetches.
      });

    return () => {
      disposed = true;

      boundSocket?.off("chatMessage", handleChatMessage);
      boundSocket?.off("chatRead", handleChatRead);
      boundSocket?.off("chatDelivered", handleChatDelivered);
    };
  }, [
    target.driverId,
    driverUserId,
    onThreadResolved,
    commitMessages,
    holdLiveArrival,
    readUpToWhatIsRendered,
    scrollToBottom,
    reportDelivered,
  ]);

  /**
   * Which hint this pane is showing, decided once for the header line and
   * the bubble below.
   *
   * Both can be lit at the same instant — the driver can be recording a
   * note with a half-written message still in his composer — and the rule
   * for which one wins is not this component's to improvise.
   */
  const activeHint = activeChatHint({
    typing: isDriverTyping,
    recording: isDriverRecording,
  });

  // The hint bubble grows the conversation from the bottom. Whoever is
  // already down there follows it; whoever is reading history stays exactly
  // where they are — the bubble just appears below, out of the way. The
  // second pass lands after the 200ms open transition, when the bubble has
  // its real height.
  //
  // Keyed on WHICH hint is showing, not on whether one is: the recording
  // bubble is taller than the dots, so a driver who starts recording while
  // "digitando" is up grows the pane a second time.
  useEffect(() => {
    if (!activeHint || !isNearBottom()) return;

    scrollToBottom();

    const timer = setTimeout(() => {
      if (isNearBottom()) scrollToBottom();
    }, 240);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHint]);

  // Coming back to the tab settles what arrived while it was away. Without
  // this the badge stays lit over a conversation that is open on screen.
  useEffect(() => {
    const handleFocus = () => {
      if (!pendingReadRef.current || !threadIdRef.current) return;

      pendingReadRef.current = false;

      // The window can have walked into the past while the tab was away, and
      // the rule does not change with the tab: read is only read from a
      // window that has the end of the conversation in it.
      if (!isAnchoredAtEnd(windowEdgesRef.current)) return;

      readUpToWhatIsRendered(threadIdRef.current);
    };

    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [readUpToWhatIsRendered]);

  // ================================================ walking the window
  /**
   * Whether the answer that just came back still describes the window that
   * is on screen.
   *
   * The reader clicking "Mensagens anteriores" and then, impatient, "Ir para
   * a última mensagem" is not an exotic case: the jump answers first, the
   * page of February arrives afterwards, and a list that deduplicates by id
   * has no way of knowing it does not belong under September.
   */
  const stillOnThisWindow = (generation: number): boolean =>
    windowGenerationRef.current === generation;

  const handleLoadOlder = async () => {
    const cursor = windowEdgesRef.current.olderCursor;

    if (!cursor || !threadIdRef.current || inFlightLoadsRef.current > 0) return;

    const generation = windowGenerationRef.current;
    const threadId = threadIdRef.current;

    const node = scrollRef.current;
    const previousHeight = node?.scrollHeight ?? 0;

    // The slot and the spinner come back whatever the answer is worth, an
    // exception included — see `runWindowLoad`.
    const outcome = await runWindowLoad(setIsLoadingOlder, () =>
      listChatMessages({
        threadId,
        before: cursor,
        businessId: actionBusinessId,
      }),
    );

    // Dropped in silence. The window it was asked about is gone, and so is
    // the reason to tell the reader anything about it.
    if (!stillOnThisWindow(generation)) return;

    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    const page = outcome.page;

    commitMessages((current) => prependOlder(current, toAscending(page)));

    // Only the past-facing cursor moves: see `edgesAfterOlderPage` for why
    // the two the page also answers must not be copied in.
    commitWindowEdges((edges) => edgesAfterOlderPage(edges, page));

    // Keep the reader on the message they were looking at.
    requestAnimationFrame(() => {
      if (node) node.scrollTop += node.scrollHeight - previousHeight;
    });
  };

  /**
   * The other direction, which only exists because the window can now start
   * somewhere other than the end.
   *
   * A conversation that stops in silence before its newest message is how a
   * dispatcher loses an answer, so the way forward is as much a part of this
   * pane as the way back.
   */
  const handleLoadNewer = async () => {
    const cursor = windowEdgesRef.current.newerCursor;

    if (!cursor || !threadIdRef.current || inFlightLoadsRef.current > 0) return;

    const generation = windowGenerationRef.current;
    const threadId = threadIdRef.current;

    const outcome = await runWindowLoad(setIsLoadingNewer, () =>
      listChatMessages({
        threadId,
        after: cursor,
        businessId: actionBusinessId,
      }),
    );

    if (!stillOnThisWindow(generation)) return;

    if (!outcome.ok) {
      toast.error(outcome.message);
      return;
    }

    const page = outcome.page;

    /**
     * Walking forward can be what finally brings the end back into the
     * window — and the end is where the held arrivals belong.
     *
     * Poured in here rather than left in the buffer, because from the next
     * line on `hasNewer` is false: the way back to the end disappears, and
     * with it the dot that was the only sign they existed.
     */
    const returnedToEnd = !page.hasNewer;
    const held = returnedToEnd ? takeHeldLive() : [];

    const rendered = commitMessages((current) => {
      const walked = appendNewer(current, toAscending(page));

      return returnedToEnd ? appendNewer(walked, held) : walked;
    });

    // A page walked forward can carry an arrival that is still in the
    // buffer. The dot counts what the reader cannot see, so it stops
    // counting the ones this page just put in front of them.
    if (!returnedToEnd) dropHeldAlreadyOnScreen(rendered);

    // The same functional shape as walking back, for the same reason: the
    // edges to build on are the ones that are current now, not the ones this
    // handler closed over before the request left.
    const edges = commitWindowEdges((current) =>
      edgesAfterNewerPage(current, page),
    );

    // ...and with the end back, everything a read cursor is allowed to
    // cover — no further than the newest message now actually rendered.
    settleReadIfAtEnd(edges);
  };

  /**
   * Straight back to the end of the conversation.
   *
   * A fresh page rather than paging forward until it arrives: the reader
   * asked for the last message, not for the four hundred between here and
   * it. The optimistic sends waiting on the wire are carried over — they
   * belong to the end, which is exactly where this lands.
   */
  const handleJumpToLatest = useCallback(async () => {
    const threadId = threadIdRef.current;

    if (!threadId || isJumpingToEndRef.current) return true;

    /**
     * The window is being replaced, so it is replaced from this line on.
     *
     * A page of history still on the wire was asked about a window that no
     * longer exists, and bumping the generation before the request goes out
     * is what makes its answer harmless. The jump itself is not blocked by
     * that request: it supersedes it, which is exactly what the reader asked
     * for by pressing this button.
     */
    windowGenerationRef.current += 1;

    const generation = windowGenerationRef.current;

    isJumpingToEndRef.current = true;

    let outcome: WindowLoadOutcome<ListChatMessagesData>;

    try {
      outcome = await runWindowLoad(setIsJumpingToEnd, () =>
        listChatMessages({ threadId, businessId: actionBusinessId }),
      );
    } finally {
      // Given back before anything is decided about the answer: a page that
      // turns out to describe a window nobody is in must still hand the
      // button back to the reader.
      isJumpingToEndRef.current = false;
    }

    // Another window took over while this page was in flight — the reader
    // opened a search hit, or switched driver.
    if (windowGenerationRef.current !== generation) return false;

    if (!outcome.ok) {
      toast.error(outcome.message);
      return false;
    }

    const page = outcome.page;
    const edges = edgesFromPage(page);

    /**
     * Taken only now, and only because this page is really being applied.
     *
     * The buffer used to be a boolean, cleared as soon as a page came back,
     * and that is the gap a message fell through for good: the server builds
     * the page at T, the driver writes at T+20ms, the socket event arrives
     * while the pane is still detached, and the page that lands cannot
     * possibly contain it. What the page does contain is dropped by id in
     * `mergeBackAtEnd`; what it does not is now on screen — which is what
     * makes marking the thread read, further down, honest.
     *
     * The condition is the same rule as everywhere else, even though a page
     * asked for without cursors always answers `hasNewer: false`: if it ever
     * did not, holding on to the arrivals is the harmless way to be wrong.
     */
    const held = isAnchoredAtEnd(edges) ? takeHeldLive() : [];

    // Anything still in flight is ours and has no server id yet; it sits at
    // the end by definition, so it rides along instead of vanishing under a
    // reload the sender did not ask for.
    commitMessages((current) =>
      mergeBackAtEnd(
        toAscending(page),
        held,
        current.filter((message) => message.pending || message.failed),
      ),
    );

    commitWindowEdges(() => edges);

    /**
     * The window is whole again, so whatever the panel was showing instead
     * of it is no longer true.
     *
     * The jump never cleared this and still marked the thread read at the
     * end of it: the error text stayed on screen over a conversation that
     * had just loaded correctly underneath it.
     */
    commitLoadError("");

    setHighlightMessageId(null);

    setCounterpartReadAt(page.counterpartLastReadAt);
    setCounterpartDeliveredAt(page.counterpartDeliveredAt);

    scrollToBottom();

    settleReadIfAtEnd(edges);

    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionBusinessId,
    commitLoadError,
    commitMessages,
    commitWindowEdges,
    runWindowLoad,
    scrollToBottom,
    settleReadIfAtEnd,
    takeHeldLive,
  ]);

  /**
   * "Revalidar Dados", arriving from the page header.
   *
   * The button lives in a sibling of this pane, with no React state between
   * them, so the react-query cache is the channel — the same one the badge
   * and the thread list already refresh through. This entry holds no data;
   * being invalidated, and answering a different number for it, IS the
   * message.
   */
  const refreshSignal = useQuery(
    [CHAT_CONVERSATION_QUERY_KEY, target.driverId],
    async () => nextRefreshTicket(),
    {
      staleTime: 0,
      keepPreviousData: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,

      /**
       * Mounting is not asking for a refresh.
       *
       * The app turns `refetchOnMount` on for every query, and this pane is
       * remounted whenever the reader comes back to a driver they had open
       * before. Inside the 30-minute cacheTime the entry is still there, so
       * the query hands over the cached ticket at once — the baseline below
       * takes it — and then refetches over it and answers a NEW number,
       * which the effect can only read as "somebody pressed atualizar". The
       * measurement: nought jumps on a first mount, one on every remount.
       *
       * An invalidation still refetches this query — that is what the button
       * does, and what this entry exists for; only the mount is excused.
       */
      refetchOnMount: false,
    },
  );

  const lastRefreshTicketRef = useRef<number | null>(null);

  useEffect(() => {
    const ticket = refreshSignal.data;

    if (ticket === undefined) return;

    // The first answer is the query starting up, not somebody asking for a
    // refresh: reloading on it would double every conversation open.
    if (lastRefreshTicketRef.current === null) {
      lastRefreshTicketRef.current = ticket;
      return;
    }

    if (lastRefreshTicketRef.current === ticket) return;

    lastRefreshTicketRef.current = ticket;

    /**
     * A conversation that failed to OPEN is not refreshed; it is retried.
     *
     * The jump below needs a thread id, and a conversation that never opened
     * is exactly the one that may never have resolved one — so what has to
     * run is the opening load, which knows how to ask by driver.
     */
    if (loadErrorRef.current) {
      reloadConversation();
      return;
    }

    /**
     * Only a window anchored at the end is reloaded.
     *
     * A reader parked on a message from March asked to be there; pulling
     * them back to today because they pressed "atualizar" would throw away
     * the thing the button was pressed next to. The conversations, the
     * unread badge and the search hits refresh either way — they are
     * invalidated by the same tag — and the way back to the end is one
     * button away.
     *
     * A window that is not resolved yet is not anchored anywhere, so the
     * opening load keeps the pane to itself: a jump fired over it would race
     * the `around` request it has in the air and win, and the reader who
     * clicked a search hit would land at today.
     */
    if (!isAnchoredAtEnd(windowEdgesRef.current)) return;

    void handleJumpToLatest();
  }, [refreshSignal.data, handleJumpToLatest, reloadConversation]);

  // ============================================================== sending
  const performSend = useCallback(
    async (outgoing: OutgoingMessage) => {
      let attachmentKey: string | undefined;

      // Photos and voice notes take the same road: a presigned PUT straight
      // to storage, then the key. The only difference is what to say when it
      // does not arrive.
      if (outgoing.kind !== "TEXT") {
        const isAudio = outgoing.kind === "AUDIO";

        if (!outgoing.localFile || !concreteBusinessId) {
          markAsFailed(outgoing.client_submission_id);
          return;
        }

        const uploaded = await uploadPhotos({
          files: { chat: [outgoing.localFile] },
          uploadType: "chatAttachments",
          businessId: concreteBusinessId,
        });

        if (!uploaded || uploaded.length === 0) {
          markAsFailed(outgoing.client_submission_id);

          // A ten-photo batch losing its connection must not stack ten
          // identical toasts: the id collapses them into one, and each
          // failed photo still carries its own retry in the album.
          toast.error(
            isAudio
              ? "Não foi possível enviar o áudio. Tente novamente."
              : "Não foi possível enviar a imagem. Tente novamente.",
            { id: "chat-attachment-upload-error" },
          );

          return;
        }

        attachmentKey = uploaded[0].key;
      }

      const result = await sendChatMessage({
        businessId: actionBusinessId,
        driverIds: [target.driverId],
        kind: outgoing.kind,
        body: outgoing.body ?? undefined,
        attachmentKey,

        // The API refuses an AUDIO without one: it is what the player draws
        // its track with before a single byte is fetched.
        durationMs: outgoing.duration_ms ?? undefined,
        deliveryId: outgoing.deliveryId ?? undefined,
        clientSubmissionId: outgoing.client_submission_id ?? undefined,
      });

      if (!result.success || !result.data) {
        markAsFailed(outgoing.client_submission_id);
        toast.error(result.message, { id: "chat-send-error" });
        return;
      }

      const confirmed = result.data.data[0];

      if (!threadIdRef.current && confirmed.threadId) {
        threadIdRef.current = confirmed.threadId;
        onThreadResolved(target.driverId, confirmed.threadId);
      }

      commitMessages((current) =>
        current.map((message) =>
          message.client_submission_id === outgoing.client_submission_id
            ? confirmed
            : message,
        ),
      );

      // The optimistic message is gone and the signed URL has taken over
      // everywhere it was rendered — the bubble, the album and an open
      // viewer. Its `blob:` is dead weight in the tab from here on.
      releaseObjectUrl(outgoing.client_submission_id);

      // First successful send consumes the pre-linked delivery chip.
      setDeliveryChip(null);
      queryClient.invalidateQueries(["chat-threads"]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      actionBusinessId,
      concreteBusinessId,
      target.driverId,
      onThreadResolved,
      releaseObjectUrl,
    ],
  );

  const markAsFailed = (clientSubmissionId: string | null) => {
    commitMessages((current) =>
      current.map((message) =>
        message.client_submission_id === clientSubmissionId
          ? { ...message, pending: false, failed: true }
          : message,
      ),
    );
  };

  /**
   * An optimistic message, ready to render and to be sent.
   *
   * `withContext` marks the one message of a batch that carries the caption
   * and the delivery chip — everything else in the batch is a bare image.
   */
  const buildOptimistic = ({
    kind,
    body,
    file,
    durationMs,
    withContext,
  }: {
    kind: OutgoingMessage["kind"];
    body: string;
    file?: File;

    /** Only a voice note has one, and it is what its player renders with. */
    durationMs?: number;
    withContext: boolean;
  }): OutgoingMessage => {
    const clientSubmissionId = crypto.randomUUID();

    const chip = withContext ? deliveryChip : null;

    // Registered as it is created: the send confirming, or this conversation
    // going away, is what gives it back — see `releaseObjectUrl`.
    let objectUrl: string | null = null;

    if (file) {
      objectUrl = URL.createObjectURL(file);
      objectUrlsRef.current.set(clientSubmissionId, objectUrl);
    }

    return {
      id: `local-${clientSubmissionId}`,
      kind,
      body: withContext && body ? body : null,
      attachment_url: objectUrl,
      duration_ms: durationMs ?? null,
      deliveryId: chip?.id ?? null,
      broadcast_id: null,
      client_submission_id: clientSubmissionId,
      threadId: threadIdRef.current ?? "",
      senderId: myUserId ?? "",
      sender: { id: myUserId ?? "", name: "Você" },
      delivery: chip
        ? { id: chip.id, recipient_name: chip.recipient_name, status: "" }
        : null,
      created_at: new Date().toISOString(),
      pending: true,
      localFile: file,
    };
  };

  /**
   * Sending from a window in the past.
   *
   * The message is going to the END of the conversation, so that is where
   * the sender has to be standing to watch it go — otherwise their own text
   * appears wedged between two messages from March. The jump is best effort:
   * if it fails, the send still happens, because a message that leaves is
   * worth more than a window that scrolled.
   */
  const stepToTheEndBeforeSending = async (): Promise<void> => {
    const edges = windowEdgesRef.current;

    /**
     * A window nobody has answered for is not somewhere to step back FROM.
     *
     * While the opening load is in the air there is no window yet: a jump
     * here would bump the generation and win the race against the `around`
     * request that load just fired, landing a reader who asked for a search
     * hit at today instead. The message is going to the end either way, and
     * the load is about to say where the end is.
     */
    if (!edges.isResolved || isAnchoredAtEnd(edges)) return;

    await handleJumpToLatest();
  };

  const handleComposerSend = (submission: ComposerSubmission) => {
    void stepToTheEndBeforeSending().then(() => appendAndSend(submission));
  };

  const appendAndSend = ({ body, imageFiles, audio }: ComposerSubmission) => {
    // A voice note travels alone — no caption, no images — the same way it
    // does from the driver's side.
    if (audio) {
      const optimistic = buildOptimistic({
        kind: "AUDIO",
        body: "",
        file: audio.file,
        durationMs: audio.durationMs,
        withContext: true,
      });

      commitMessages((current) => [...current, optimistic]);
      scrollToBottom();

      dispatchSend(optimistic);
      return;
    }

    if (imageFiles.length === 0) {
      const optimistic = buildOptimistic({
        kind: "TEXT",
        body,
        withContext: true,
      });

      commitMessages((current) => [...current, optimistic]);
      scrollToBottom();

      dispatchSend(optimistic);
      return;
    }

    // One message per image, the way every messenger does it — no API change
    // needed, and each image keeps its own submission id, so a retry is still
    // idempotent per photo. The caption goes on the last one, which is where
    // it reads as the caption of the album rather than a note before it.
    const batch = imageFiles.map((file, index) =>
      buildOptimistic({
        kind: "IMAGE",
        body,
        file,
        withContext: index === imageFiles.length - 1,
      }),
    );

    commitMessages((current) => [...current, ...batch]);
    scrollToBottom();

    void sendInOrder(batch);
  };

  /**
   * Fires a send and guarantees the bubble ends up somewhere real.
   *
   * A server action call is an RPC: it can REJECT in transit — a network
   * blip, a 502 at the edge, a deploy swapping the deployment id mid-session
   * — no matter how careful the action's own try block is. `sendChatMessage`
   * even reads its cookie before entering that block. A rejection that nobody
   * catches leaves the bubble spinning its pending clock forever: no red
   * bubble, no "try again", and an operator convinced the message went out.
   *
   * Worse on a retry, where the button only renders for `failed`: a rejected
   * second attempt would put the bubble back to pending and take the retry
   * away with it, stranding the message for good.
   */
  const dispatchSend = (outgoing: OutgoingMessage) => {
    void performSend(outgoing).catch(() =>
      markAsFailed(outgoing.client_submission_id),
    );
  };

  /**
   * Sends a batch one at a time so the images land in the order they were
   * picked. Each send already reports its own failure and leaves that
   * message with the retry affordance — so the loop swallows nothing and
   * stops for nothing: photo 3 failing must not cost photos 4 and 5.
   */
  const sendInOrder = async (batch: OutgoingMessage[]) => {
    for (const outgoing of batch) {
      try {
        await performSend(outgoing);
      } catch (error) {
        markAsFailed(outgoing.client_submission_id);
      }
    }
  };

  const handleRetry = (failed: ClientChatMessage) => {
    commitMessages((current) =>
      current.map((message) =>
        message.id === failed.id
          ? { ...message, pending: true, failed: false }
          : message,
      ),
    );

    // The same submission id makes the retry a no-op if the first attempt
    // actually landed — the API answers with the existing message.
    dispatchSend({ ...failed, pending: true, failed: false });
  };

  /**
   * The three ways of walking the window, disabled as one.
   *
   * They do not extend the same list — one prepends history, one appends it,
   * one throws the list away — so two of them in the air at once is two
   * answers about a window only one of them still describes. The generation
   * makes the loser harmless; this is what keeps the reader from creating
   * the situation in the first place.
   */
  const isWalkingTheWindow = isLoadingOlder || isLoadingNewer || isJumpingToEnd;

  // ============================================================ presence
  const renderPresenceLine = () => {
    // The live hint outranks presence: "online agora" is the least useful
    // true thing that can be said about someone who is talking to you.
    if (activeHint) {
      return (
        <span className="text-xs font-medium text-primary">
          {chatHintLabel(activeHint)}
        </span>
      );
    }

    // Unknown until the conversation answers. Announcing "no app access"
    // while the request is in flight is how a driver who has been chatting
    // for months got labelled as never having installed the app.
    if (driverUser === undefined) return null;

    if (driverUser === null) {
      return (
        <span className="text-xs text-muted-foreground">
          Motorista ainda sem acesso ao aplicativo
        </span>
      );
    }

    if (presence?.online) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          online agora
        </span>
      );
    }

    const lastSeen = formatLastSeen(
      presence?.lastSeenAt ?? driverUser.last_seen_at,
    );

    return (
      <span className="text-xs text-muted-foreground">{lastSeen ?? "—"}</span>
    );
  };

  return (
    // `min-w-0` all the way down: every ancestor of a message bubble has to
    // be allowed to be narrower than its content, otherwise the widest
    // message in the thread decides how wide the pane is.
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      {/* ------------------------------------------------------- header */}
      <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 lg:hidden"
          onClick={onBack}
          aria-label="Voltar para as conversas"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center
          rounded-full bg-primary/10 text-sm font-semibold text-primary"
        >
          {formatInitials(target.driverName)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{target.driverName}</p>
          {renderPresenceLine()}
        </div>

        {target.cnh && (
          <span className="hidden text-xs text-muted-foreground sm:block">
            CNH: {target.cnh}
          </span>
        )}
      </div>

      {/* ----------------------------------------------------- messages */}
      {/* `relative` so the way back to the end can float over the history
          instead of taking a row from it. */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto bg-muted/30 px-4 py-4"
          data-tutorial="chat-conversation"
        >
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {loadError}
              </p>

              {/*
                The way out, which this state did not have.

                The pane short-circuits on `loadError` and the floating "Ir
                para a última mensagem" is drawn behind `!loadError`, so a
                conversation that failed to open showed this sentence for the
                rest of the session — while the window behind it, left
                reading as "anchored at the end", went on accepting arrivals
                and marking the thread read over them.
              */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={reloadConversation}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>

              {/* What arrived meanwhile is held, not lost, and saying so is
                  the difference between waiting and reloading the page. */}
              {heldLiveCount > 0 && (
                <p className="text-xs text-muted-foreground" role="status">
                  {heldLiveCount === 1
                    ? "1 mensagem nova chegou e aparece assim que a conversa carregar."
                    : `${heldLiveCount} mensagens novas chegaram e aparecem assim que a conversa carregar.`}
                </p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                Diga olá 👋 — a conversa com{" "}
                <strong>{target.driverName}</strong> começa na primeira
                mensagem.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {windowEdges.olderCursor && (
                <div className="flex justify-center pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isWalkingTheWindow}
                    onClick={handleLoadOlder}
                  >
                    {isLoadingOlder ? (
                      <Loader className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronUp className="mr-1 h-3 w-3" />
                    )}
                    Mensagens anteriores
                  </Button>
                </div>
              )}

              {groups.map((group, index) => {
                const first = group.messages[0];

                const previousGroup = groups[index - 1];
                const previous = previousGroup?.messages[
                  previousGroup.messages.length - 1
                ];

                const needsSeparator =
                  !previous ||
                  !isSameDay(
                    new Date(previous.created_at),
                    new Date(first.created_at),
                  );

                const isOwnSide = first.senderId !== driverUserId;

                const showSenderName =
                  isOwnSide &&
                  first.senderId !== myUserId &&
                  (!previous || previous.senderId !== first.senderId);

                /**
                 * Every id of the row, so a message inside a photo album can
                 * be found by `~=` just like a lone bubble — the album is one
                 * element and the jumped-to photo may be any of its tiles.
                 */
                const groupMessageIds = group.messages
                  .map((message) => message.id)
                  .join(" ");

                const isFocused =
                  highlightMessageId !== null &&
                  group.messages.some(
                    (message) => message.id === highlightMessageId,
                  );

                return (
                  <div
                    key={group.key}
                    data-chat-messages={groupMessageIds}
                    className={cn(
                      // The inset padding is unconditional: a tint that also
                      // pushes the row around announces itself twice.
                      "-mx-2 space-y-1.5 rounded-lg px-2 py-1",
                      "transition-colors duration-700",
                      isFocused && "bg-primary/15",
                    )}
                  >
                    {needsSeparator && (
                      <div className="flex justify-center py-2">
                        <span
                          className="rounded-full bg-card px-3 py-1 text-xs
                          text-muted-foreground shadow-sm"
                        >
                          {formatDaySeparator(first.created_at)}
                        </span>
                      </div>
                    )}

                    {group.messages.length > 1 ? (
                      <ImageAlbumBubble
                        messages={group.messages}
                        isOwnSide={isOwnSide}
                        showSenderName={showSenderName}
                        counterpartDeliveredAt={counterpartDeliveredAt}
                        counterpartLastReadAt={counterpartReadAt}
                        onOpenDelivery={setDetailDeliveryId}
                        onOpenImage={handleOpenImage}
                        onRetry={handleRetry}
                      />
                    ) : (
                      <MessageBubble
                        message={first}
                        isOwnSide={isOwnSide}
                        showSenderName={showSenderName}
                        counterpartDeliveredAt={counterpartDeliveredAt}
                        counterpartLastReadAt={counterpartReadAt}
                        onOpenDelivery={setDetailDeliveryId}
                        onOpenImage={handleOpenImage}
                        onRetry={handleRetry}
                      />
                    )}
                  </div>
                );
              })}

              {windowEdges.newerCursor && (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isWalkingTheWindow}
                    onClick={handleLoadNewer}
                  >
                    {isLoadingNewer ? (
                      <Loader className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="mr-1 h-3 w-3" />
                    )}
                    Mensagens mais recentes
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Both stay mounted and only one is ever open: a bubble that
              unmounts cannot animate away, and swapping one hint for the
              other is then a height transition rather than a jump. */}
          {!isLoading && !loadError && (
            <>
              <TypingBubble isTyping={activeHint === "typing"} />
              <RecordingBubble isRecording={activeHint === "recording"} />
            </>
          )}
        </div>

        {/*
          The way home. Visible for exactly as long as the end of the
          conversation is out of the window — a pane that quietly stops short
          of the newest message is how an answer gets lost.
        */}
        {!isLoading && !loadError && windowEdges.hasNewer && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-3 flex
            justify-center"
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="pointer-events-auto h-8 gap-1.5 rounded-full border
              shadow-md"
              disabled={isWalkingTheWindow}
              onClick={() => void handleJumpToLatest()}
            >
              {isJumpingToEnd ? (
                <Loader className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronsDown className="h-3.5 w-3.5" />
              )}
              Ir para a última mensagem
              {heldLiveCount > 0 && (
                <span
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-label={
                    heldLiveCount === 1
                      ? "1 mensagem nova na conversa"
                      : `${heldLiveCount} mensagens novas na conversa`
                  }
                />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- composer */}
      {isReadOnly ? (
        <ReadOnlyNotice />
      ) : (
        <ChatComposer
          canWrite={canWrite}
          onSend={handleComposerSend}
          onTyping={emitTyping}
          onCapturingChange={reportRecordingCapture}
          deliveryChip={deliveryChip}
          onClearDeliveryChip={() => setDeliveryChip(null)}
        />
      )}

      {/* ------------------------------------------------------ dialogs */}
      {galleryAnchor && (
        <ChatImageViewer
          photos={galleryPhotos}
          anchorKey={galleryAnchor}
          conversationName={target.driverName}
          onRenewPhoto={handleRenewPhoto}
          onClose={handleCloseGallery}
        />
      )}

      {detailDeliveryId && concreteBusinessId && (
        <DeliveryDetailDialog
          businessId={concreteBusinessId}
          deliveryId={detailDeliveryId}
          onClose={() => setDetailDeliveryId(null)}
        />
      )}
    </div>
  );
};

export { Conversation };
