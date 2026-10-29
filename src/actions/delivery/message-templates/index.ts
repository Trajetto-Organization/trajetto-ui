"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

// ON_THE_WAY: the driver is heading to the address now (decision 6.4).
type MessageTopic = "DISPATCHED" | "ON_THE_WAY" | "DELIVERED" | "FAILED";
type MessageChannel = "EMAIL" | "WHATSAPP";

interface MessageTemplate {
  id: string;

  topic: MessageTopic;
  channel: MessageChannel;

  subject: string | null;
  body: string;

  is_active: boolean;
  businessId: string;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const listMessageTemplates = async (
  businessId: string,
): Promise<ActionResponse<MessageTemplate[]>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/message-templates?businessId=${businessId}`,
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
        message: result.message || "Houve um erro ao carregar as mensagens.",
      };
    }

    return { success: true, message: result.message, data: result.data };
  } catch (error) {
    logActionError("delivery/message-templates/listMessageTemplates", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar as mensagens.",
    };
  }
};

interface SaveMessageTemplatePayload {
  topic: MessageTopic;
  channel: MessageChannel;

  subject?: string | null;
  body: string;

  is_active: boolean;
}

/**
 * PUT, because there is at most one message per company × moment × channel.
 *
 * The API refuses an unknown variable and a WhatsApp message with no opt-out
 * link, and those refusals arrive here as plain sentences — the form shows
 * them verbatim rather than inventing its own copy of the rules, which would
 * be a second place for them to drift.
 */
const saveMessageTemplate = async (
  businessId: string,
  payload: SaveMessageTemplatePayload,
): Promise<ActionResponse> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/message-template/${businessId}`,
      {
        credentials: "include",
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      // A schema refusal arrives as "Validation Error" with the sentences in
      // `issues` (an unknown {{variável}}, a body of spaces): the first one
      // is what the person has to fix.
      const issue =
        Array.isArray(result.issues) && typeof result.issues[0] === "string"
          ? (result.issues[0] as string)
          : null;

      return {
        success: false,
        message:
          issue ?? (result.message || "Houve um erro ao salvar a mensagem."),
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    logActionError("delivery/message-templates/saveMessageTemplate", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao salvar a mensagem.",
    };
  }
};

export { listMessageTemplates, saveMessageTemplate };
export type {
  MessageChannel,
  MessageTemplate,
  MessageTopic,
  SaveMessageTemplatePayload,
};
