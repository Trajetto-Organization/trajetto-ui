"use server";

import { logActionError } from "@/lib/log-action-error";
import { idempotencyHeaderOf } from "@/lib/idempotency-key";
import { getCookies } from "../../cookies";

import type {
  ActionResponse,
  ChatMessageKind,
  ChatSendOutcome,
  ChatSendSummary,
  SentChatMessage,
} from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

interface SendChatMessageProps {
  businessId?: string;

  /** The chosen drivers. Omitted when `audience` names the recipients. */
  driverIds?: string[];

  /** "Todos os motoristas ativos com o app", resolved by the API. */
  audience?: "ALL_ACTIVE_WITH_APP";
  kind: ChatMessageKind;
  body?: string;
  attachmentKey?: string;
  durationMs?: number;
  deliveryId?: string;

  /** The route the message is about (decision 6.7). */
  routeId?: string;
  clientSubmissionId?: string;

  /**
   * The notice's key (IDEMP-14), sent as the Idempotency-Key header — for
   * one recipient too: with a single driver selected the dialog used to send
   * no key, and a retry duplicated the message. A retry after a failure
   * halfway through rings only the drivers the first attempt did not reach.
   */
  broadcastKey?: string;

  /**
   * The support ticket the message belongs to (decision 14.5). Without it a
   * one-driver message goes through the API's legacy routing.
   */
  ticketId?: string;
}

interface SendChatMessageData {
  data: SentChatMessage[];

  /**
   * What happened to each recipient. Empty when the API is older than this
   * web and did not say — the caller then counts the messages it got back.
   */
  outcomes: ChatSendOutcome[];
  summary: ChatSendSummary | null;
}

const sendChatMessage = async ({
  businessId,
  driverIds,
  audience,
  kind,
  body,
  attachmentKey,
  durationMs,
  deliveryId,
  routeId,
  clientSubmissionId,
  broadcastKey,
  ticketId,
}: SendChatMessageProps): Promise<ActionResponse<SendChatMessageData>> => {
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
      `${process.env.HTTP_REQUEST}/chat/send-message`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
          ...idempotencyHeaderOf(broadcastKey),
        },
        body: JSON.stringify({
          ...(driverIds && driverIds.length > 0 && { driverIds }),
          ...(audience && { audience }),
          kind,
          ...(body && { body }),
          ...(attachmentKey && { attachmentKey }),
          ...(durationMs && { durationMs }),
          ...(deliveryId && { deliveryId }),
          ...(routeId && { routeId }),
          ...(clientSubmissionId && { clientSubmissionId }),
          ...(ticketId && { ticketId }),
          ...(businessId && { businessId }),
        }),
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao enviar a mensagem.",
      };
    }

    return {
      success: true,
      message: "Mensagem enviada!",
      data: {
        data: result.data as SentChatMessage[],
        outcomes: Array.isArray(result.outcomes)
          ? (result.outcomes as ChatSendOutcome[])
          : [],
        summary: (result.summary as ChatSendSummary | undefined) ?? null,
      },
    };
  } catch (error) {
    logActionError("chat/send-chat-message", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao enviar a mensagem.",
    };
  }
};

export { sendChatMessage };
export type { SendChatMessageData };
