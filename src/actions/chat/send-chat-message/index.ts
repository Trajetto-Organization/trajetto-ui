"use server";

import { getCookies } from "../../cookies";

import type {
  ActionResponse,
  ChatMessageKind,
  SentChatMessage,
} from "../chat.types";

interface SendChatMessageProps {
  businessId?: string;
  driverIds: string[];
  kind: ChatMessageKind;
  body?: string;
  attachmentKey?: string;
  durationMs?: number;
  deliveryId?: string;
  clientSubmissionId?: string;
}

const sendChatMessage = async ({
  businessId,
  driverIds,
  kind,
  body,
  attachmentKey,
  durationMs,
  deliveryId,
  clientSubmissionId,
}: SendChatMessageProps): Promise<
  ActionResponse<{ data: SentChatMessage[] }>
> => {
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
      `${process.env.HTTP_REQUEST}/chat/send-message`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          driverIds,
          kind,
          ...(body && { body }),
          ...(attachmentKey && { attachmentKey }),
          ...(durationMs && { durationMs }),
          ...(deliveryId && { deliveryId }),
          ...(clientSubmissionId && { clientSubmissionId }),
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
      data: { data: result.data as SentChatMessage[] },
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao enviar a mensagem.",
    };
  }
};

export { sendChatMessage };
