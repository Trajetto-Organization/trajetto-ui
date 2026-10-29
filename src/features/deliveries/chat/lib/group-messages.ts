import { isSameDay } from "./format";
import type { ClientChatMessage } from "./types";

/** How far apart two photos can be and still read as one album. */
const ALBUM_WINDOW_MS = 2 * 60 * 1000;

interface ChatMessageGroup {
  /** The first message's id — stable enough to key the list on. */
  key: string;

  /** One message for a normal bubble, several for a photo album. */
  messages: ClientChatMessage[];
}

/**
 * Collapses runs of photos into albums, the way a messenger does.
 *
 * Only consecutive IMAGE messages from the same sender, on the same day and
 * within two minutes of each other, are grouped — which is exactly the shape
 * a multi-image send produces, and also the shape a driver photographing a
 * delivery from three angles produces.
 *
 * A message carrying a caption or a delivery link *closes* its group: it can
 * join what came before, but nothing joins after it. That is what keeps the
 * album's caption honest — an album renders the text of its last message, so
 * a captioned photo must never end up in the middle of one, where its text
 * would silently disappear.
 *
 * Pure: no React, no clock of its own, no side effects.
 */
function groupChatMessages(messages: ClientChatMessage[]): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];

  // A group stops accepting members once a captioned photo lands in it.
  let isOpen = false;

  const closesGroup = (message: ClientChatMessage): boolean =>
    Boolean(message.body) || Boolean(message.deliveryId);

  for (const message of messages) {
    const currentGroup = groups[groups.length - 1];
    const previous = currentGroup?.messages[currentGroup.messages.length - 1];

    const canAppend =
      isOpen &&
      !!previous &&
      message.kind === "IMAGE" &&
      previous.kind === "IMAGE" &&
      message.senderId === previous.senderId &&
      isSameDay(new Date(previous.created_at), new Date(message.created_at)) &&
      new Date(message.created_at).getTime() -
        new Date(previous.created_at).getTime() <=
        ALBUM_WINDOW_MS;

    if (canAppend && currentGroup) {
      currentGroup.messages.push(message);
    } else {
      groups.push({ key: message.id, messages: [message] });
    }

    isOpen = message.kind === "IMAGE" && !closesGroup(message);
  }

  return groups;
}

export { groupChatMessages, ALBUM_WINDOW_MS };
export type { ChatMessageGroup };
