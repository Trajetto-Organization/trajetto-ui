"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type { ActionResponse, SentChatMessage } from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

interface SearchChatMessagesProps {
  businessId?: string;
  search: string;
  limit?: number;
}

/** Each hit carries the driver of its conversation, ready to jump into. */
const searchChatMessages = async ({
  businessId,
  search,
  limit = 20,
}: SearchChatMessagesProps): Promise<
  ActionResponse<{ data: SentChatMessage[] }>
> => {
  const query = new URLSearchParams({
    search,
    limit: String(limit),
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

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/chat/search-messages?${query.toString()}`,
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
        message: result.message || "Houve um erro ao buscar mensagens.",
      };
    }

    return {
      success: true,
      message: "Busca concluída.",
      data: { data: result.data as SentChatMessage[] },
    };
  } catch (error) {
    logActionError("chat/search-chat-messages", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao buscar mensagens.",
    };
  }
};

export { searchChatMessages };
