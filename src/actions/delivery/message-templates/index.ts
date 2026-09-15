"use server";

import { getCookies } from "../../cookies";

type MessageTopic = "DISPATCHED" | "DELIVERED" | "FAILED";
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
    const response = await fetch(
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
    const response = await fetch(
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
      return {
        success: false,
        message: result.message || "Houve um erro ao salvar a mensagem.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
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
