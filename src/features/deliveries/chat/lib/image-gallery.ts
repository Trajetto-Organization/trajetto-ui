import type { ClientChatMessage } from "./types";

/**
 * The conversation's photos as one linear gallery.
 *
 * Every photo of the loaded conversation, in the order the screen renders
 * them — the same `messages` array, only filtered. Albums are presentation:
 * a multi-image send is already several messages underneath, so opening the
 * third cell of an album is just entering this list at that position.
 *
 * Pure on purpose: no React, no DOM, no clock of its own. Index arithmetic
 * that lives inside an event handler is index arithmetic that stops agreeing
 * with itself — the on-screen arrows, the keyboard and the swipe all step
 * through the functions here.
 */

/**
 * How many photos are mounted around the current one.
 *
 * One each side, and not a photo more: a conversation with three hundred
 * photos must not instantiate three hundred images, and the attachments are
 * served `unoptimized` (the signed URL does not pass Next's remotePatterns),
 * so every mounted slide downloads the original file in full.
 */
const GALLERY_WINDOW_RADIUS = 1;

interface GalleryPhoto {
  /** Stable across the optimistic → confirmed swap; see `galleryKeyOf`. */
  key: string;

  /**
   * The server's id for this message, or null while it is still optimistic.
   *
   * Only a message the API already knows can have its signature renewed, and
   * a photo that has not left the device carries a `blob:` that never expires
   * anyway — so null here reads as "there is nothing to renew".
   */
  messageId: string | null;

  /** Signed URL, or the local `blob:` of a photo still going out. */
  url: string;

  /**
   * This photo's own caption, which for every photo of a batch but the last
   * one is null — the composer puts the text on the last message. That is
   * the honest answer here: the album's caption belongs to the album.
   */
  caption: string | null;

  senderName: string;
  createdAt: string;

  pending: boolean;
  failed: boolean;
}

/**
 * The identity a gallery position is anchored to.
 *
 * Not the id: an optimistic message is born `local-<uuid>` and is replaced,
 * in place, by the server's message the moment the send confirms. The
 * submission id is the one field that survives that swap, so a viewer left
 * open over a photo that has just been sent keeps pointing at it.
 */
const galleryKeyOf = (
  message: Pick<ClientChatMessage, "id" | "client_submission_id">,
): string => message.client_submission_id ?? message.id;

/**
 * Reads the gallery out of the conversation, in the conversation's order.
 *
 * A photo still going out — or one that failed to — is in here too: the
 * bubble shows it, so the viewer has to be able to open it. Its `blob:` URL
 * is local and never expires, which is why the two states travel along:
 * a failure to load one of those is not an expired link.
 */
const buildImageGallery = (messages: ClientChatMessage[]): GalleryPhoto[] => {
  const photos: GalleryPhoto[] = [];

  for (const message of messages) {
    if (message.kind !== "IMAGE" || !message.attachment_url) continue;

    const isOptimistic = Boolean(message.pending || message.failed);

    photos.push({
      key: galleryKeyOf(message),
      // An optimistic message's id is local to this tab; handing it to the
      // API would only ever answer "não encontrada".
      messageId: isOptimistic ? null : message.id,
      url: message.attachment_url,
      caption: message.body,
      senderName: message.sender.name,
      createdAt: message.created_at,
      pending: Boolean(message.pending),
      failed: Boolean(message.failed),
    });
  }

  return photos;
};

/** Where a photo sits right now, or -1 when it is no longer in the list. */
const findGalleryIndex = (
  photos: GalleryPhoto[],
  key: string | null,
): number => (key === null ? -1 : photos.findIndex((photo) => photo.key === key));

/** Any number onto a real position, or -1 for an empty gallery. */
const clampGalleryIndex = (index: number, count: number): number => {
  if (count <= 0) return -1;
  if (!Number.isFinite(index)) return 0;

  return Math.min(Math.max(Math.trunc(index), 0), count - 1);
};

/** Whether there is anything `delta` steps away from here. */
const canStepGallery = (
  index: number,
  count: number,
  delta: number,
): boolean => {
  if (count <= 0 || index < 0 || index >= count) return false;

  const target = index + delta;

  return target >= 0 && target < count;
};

/**
 * The photo `delta` steps from `key`.
 *
 * Answers in keys, not in indices, because the list moves underneath an open
 * viewer: "Mensagens anteriores" prepends a whole page and shifts every index
 * by the size of it. Holding the identity and deriving the index per render
 * is what keeps the viewer on the photo the reader is actually looking at.
 *
 * The ends of the gallery are ends, not a loop: stepping past either one
 * answers the same key back, so a burst of clicks on an arrow settles on the
 * last photo instead of wrapping around or running off the list.
 */
const stepGalleryKey = (
  photos: GalleryPhoto[],
  key: string | null,
  delta: number,
): string | null => {
  const index = findGalleryIndex(photos, key);

  if (index < 0) return null;

  const target = index + delta;

  if (target < 0 || target >= photos.length) return key;

  return photos[target].key;
};

/**
 * The positions that get mounted: the current photo and its neighbours.
 *
 * Clipped at the ends rather than padded, so the first photo mounts two
 * slides and not three.
 */
const galleryWindowIndices = (index: number, count: number): number[] => {
  if (count <= 0 || index < 0 || index >= count) return [];

  const indices: number[] = [];

  for (
    let offset = -GALLERY_WINDOW_RADIUS;
    offset <= GALLERY_WINDOW_RADIUS;
    offset += 1
  ) {
    const candidate = index + offset;

    if (candidate >= 0 && candidate < count) indices.push(candidate);
  }

  return indices;
};

/**
 * "3 / 12" — of the conversation as it is loaded right now.
 *
 * There is history behind `nextCursor` that nobody has asked for yet, so this
 * total can grow when the reader loads older messages. It is the only honest
 * number available, which is why the UI never calls it "all the photos".
 */
const formatGalleryCounter = (index: number, count: number): string =>
  count > 0 && index >= 0 && index < count ? `${index + 1} / ${count}` : "";

export {
  GALLERY_WINDOW_RADIUS,
  galleryKeyOf,
  buildImageGallery,
  findGalleryIndex,
  clampGalleryIndex,
  canStepGallery,
  stepGalleryKey,
  galleryWindowIndices,
  formatGalleryCounter,
};

export type { GalleryPhoto };
