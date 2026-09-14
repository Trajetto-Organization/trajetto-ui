"use server";

import { getCookies } from "../../cookies";

import type { ActionResponse } from "../chat.types";

interface GetChatAttachmentUrlProps {
  /** Only the MASTER passes it; it rides into every chat action. */
  businessId?: string;

  /** The server's id for the message — never an optimistic `local-` one. */
  messageId: string;
}

interface GetChatAttachmentUrlData {
  /** A freshly signed link, or null when the message carries no file. */
  attachment_url: string | null;
}

/**
 * One photo's link, signed again.
 *
 * A signed attachment URL expires, and until this route existed the only way
 * to renew one was to reload the whole conversation — which on a phone
 * replaces the list with the 40 newest messages, loses the photo the gallery
 * is anchored to and closes the viewer on top of the reader. This renews a
 * single message and touches nothing else.
 */
const getChatAttachmentUrl = async ({
  businessId,
  messageId,
}: GetChatAttachmentUrlProps): Promise<
  ActionResponse<GetChatAttachmentUrlData>
> => {
  const query = new URLSearchParams({
    messageId,
    ...(businessId && { businessId }),
  });

  try {
    /**
     * Read inside the try, not before it.
     *
     * A server action that throws REJECTS at the caller instead of answering
     * `{ success: false }`, and every caller here is written against the
     * answer. Reading the cookie outside meant a failure in `cookies()` — or
     * anything else above the block — surfacing as an unhandled rejection.
     */
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/chat/attachment-url?${query.toString()}`,
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
        message: result.message || "Não foi possível renovar o link da foto.",
      };
    }

    return {
      success: true,
      message: "Link da foto renovado.",
      data: result as GetChatAttachmentUrlData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao renovar o link da foto.",
    };
  }
};

export { getChatAttachmentUrl };
export type { GetChatAttachmentUrlData };
