"use server";

import { getCookies } from "../../cookies";

import type {
  ActionResponse,
  ChatDriverUser,
  ChatMessage,
} from "../chat.types";

interface ListChatMessagesProps {
  businessId?: string;

  /** Takes precedence when both are given. */
  threadId?: string;

  /**
   * The other way in: the API resolves the conversation with this driver on
   * the server. No conversation yet answers `threadId: null` with an empty
   * list — an empty chat, never an error.
   */
  driverId?: string;

  /** Exclusive cursor into the PAST: only older messages come back. */
  before?: { created_at: string; id: string };

  /** The mirror, walking towards the present. */
  after?: { created_at: string; id: string };

  /**
   * Centres the page on this message instead of on the end of the
   * conversation — "pular para a mensagem" from a search hit.
   *
   * Takes precedence over both cursors, and the server is the one that
   * resolves it: only it knows the message's position, and only it can check
   * the message really belongs to this conversation before centring on it. A
   * message from another conversation answers 400.
   */
  around?: string;

  limit?: number;
  search?: string;
}

interface ListChatMessagesData {
  threadId: string | null;
  data: ChatMessage[];
  nextCursor: { created_at: string; id: string } | null;

  /**
   * The cursor towards the present — exclusive, pointing at the NEWEST
   * message of this page. Null whenever there is nothing newer to walk to.
   */
  previousCursor: { created_at: string; id: string } | null;

  /**
   * Whether the conversation carries on past the top of this window.
   *
   * False for every page that came from the end of the conversation, which
   * is the ordinary case; true only for a window centred on a message, or
   * one walked forward and not yet all the way home.
   */
  hasNewer: boolean;

  /** How far the driver's device has received; null on the driver side. */
  counterpartDeliveredAt: string | null;

  /** How far the driver has read the thread. */
  counterpartLastReadAt: string | null;

  /** Null means the driver genuinely has no app account. */
  driverUser: ChatDriverUser | null;
}

const listChatMessages = async ({
  businessId,
  threadId,
  driverId,
  before,
  after,
  around,
  limit = 40,
  search,
}: ListChatMessagesProps): Promise<ActionResponse<ListChatMessagesData>> => {
  /**
   * Everything, `getCookies` included, inside the try.
   *
   * The cookie read used to sit outside it, and `getCookies` rethrows
   * whatever `next/headers` gives it — so this action could REJECT instead
   * of answering `{ success: false }`. Every caller in the conversation
   * pane reads the answer as a value and releases its in-flight slot after
   * the await, in straight-line code: a rejection skipped the release and
   * left the three window buttons disabled for the rest of the session.
   *
   * The callers were made exception-safe too (see `window-load`), because a
   * server action can also fail in transport, where nothing on this side
   * runs at all. This is the half that stops the failure from ever starting.
   */
  try {
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    if (!threadId && !driverId) {
      return {
        success: false,
        message: "Conversa não identificada.",
      };
    }

    const query = new URLSearchParams({
      limit: String(limit),
      ...(threadId && { threadId }),
      ...(driverId && { driverId }),
      ...(before && { beforeAt: before.created_at, beforeId: before.id }),
      ...(after && { afterAt: after.created_at, afterId: after.id }),
      ...(around && { aroundMessageId: around }),
      ...(search && { search }),
      ...(businessId && { businessId }),
    });

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/chat/list-messages?${query.toString()}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao carregar a conversa.",
      };
    }

    return {
      success: true,
      message: "Conversa carregada.",

      // The two window fields are normalised rather than trusted: a page
      // from the end of the conversation legitimately omits them, and
      // `hasNewer` reaching the panel as undefined would read as "the end is
      // loaded" in one place and as "unknown" in the next.
      data: {
        ...(result as ListChatMessagesData),
        previousCursor: result.previousCursor ?? null,
        hasNewer: Boolean(result.hasNewer),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar a conversa.",
    };
  }
};

export { listChatMessages };
export type { ListChatMessagesData };
