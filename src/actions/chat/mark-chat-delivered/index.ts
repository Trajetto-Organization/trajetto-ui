"use server";

import { getCookies } from "../../cookies";

import type { ActionResponse, ChatReceiptSide } from "../chat.types";

interface MarkChatDeliveredProps {
  businessId?: string;
  threadId: string;

  /** ISO stamp of the newest message actually received; defaults to now. */
  deliveredAt?: string;
}

interface MarkChatDeliveredData {
  delivered_at: string;

  /** Which cursor the API moved, inferred from the token that called it. */
  side: ChatReceiptSide;
}

/**
 * Advances this side's delivery cursor on a thread.
 *
 * The endpoint is symmetric: the token decides whose cursor moves — the
 * driver's on his phone, the team's from any panel of the company — and a
 * MASTER is refused, because support is not a counter the driver is talking
 * to. Every caller here treats it as fire-and-forget: a receipt that never
 * lands only costs a grey check that turns double a moment later.
 */
const markChatDelivered = async ({
  businessId,
  threadId,
  deliveredAt,
}: MarkChatDeliveredProps): Promise<ActionResponse<MarkChatDeliveredData>> => {
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
      `${process.env.HTTP_REQUEST}/chat/mark-delivered`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          ...(deliveredAt && { deliveredAt }),
          ...(businessId && { businessId }),
        }),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Não foi possível confirmar o recebimento.",
      };
    }

    return {
      success: true,
      message: "Recebimento confirmado.",
      data: result.data as MarkChatDeliveredData,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao confirmar o recebimento.",
    };
  }
};

export { markChatDelivered };
export type { MarkChatDeliveredData };
