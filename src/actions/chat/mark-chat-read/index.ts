"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type { ActionResponse } from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

interface MarkChatReadProps {
  businessId?: string;
  threadId: string;

  /**
   * ISO `created_at` of the newest message the reader actually has on
   * screen; the server uses its own clock without it.
   *
   * Sending it is what keeps the cursor honest. A cursor stamped with "now"
   * covers the WHOLE thread up to this instant — including a message that
   * reached the browser while the window was parked in the past and was
   * never drawn — and the driver would see the blue check over something
   * nobody read. The server clamps it to now and never lets the cursor go
   * backwards, so a client clock cannot buy anything with it either.
   */
  readAt?: string;
}

const markChatRead = async ({
  businessId,
  threadId,
  readAt,
}: MarkChatReadProps): Promise<ActionResponse> => {
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

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/chat/mark-read`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          ...(readAt && { readAt }),
          ...(businessId && { businessId }),
        }),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Não foi possível marcar como lida.",
      };
    }

    return { success: true, message: "Conversa marcada como lida." };
  } catch (error) {
    logActionError("chat/mark-chat-read", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao marcar a conversa como lida.",
    };
  }
};

export { markChatRead };
