"use server";

import { logActionError } from "@/lib/log-action-error";
import { classifyAccessError } from "@/lib/access-error";
import { getCookies } from "../../cookies";

import type { ActionResponse, ChatThreadEntry } from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

interface ListChatThreadsProps {
  businessId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

interface ListChatThreadsData {
  data: ChatThreadEntry[];
  total: number;
  totalUnread: number;
}

const listChatThreads = async ({
  businessId,
  page = 1,
  pageSize = 100,
  search = "",
}: ListChatThreadsProps): Promise<ActionResponse<ListChatThreadsData>> => {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
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
      `${process.env.HTTP_REQUEST}/chat/list-threads?${query.toString()}`,
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
        // Named by the API's code, not by the status: only MODULE_NOT_ENABLED
        // is the module state; the panel draws each refusal as what it is.
        accessError: classifyAccessError(response.status, result),
        message: result.message || "Houve um erro ao carregar as conversas.",
      };
    }

    return {
      success: true,
      message: "Conversas carregadas.",
      data: result as ListChatThreadsData,
    };
  } catch (error) {
    logActionError("chat/list-chat-threads", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar as conversas.",
    };
  }
};

export { listChatThreads };
export type { ListChatThreadsData };
