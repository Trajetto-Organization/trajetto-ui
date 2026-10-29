"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type {
  ActionResponse,
  ChatAudienceCount,
  ChatRecipient,
} from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

interface ListChatRecipientsProps {
  businessId?: string;
  search?: string;

  /** One side of the app line; both when omitted. */
  app?: "WITH_APP" | "WITHOUT_APP";
  cursor?: string;
  limit?: number;
}

interface ListChatRecipientsData {
  data: ChatRecipient[];
  nextCursor: string | null;
  hasMore: boolean;

  /** Company-wide counts, on the first page only. */
  audience: ChatAudienceCount | null;
}

/**
 * The company's active drivers for the chat pickers.
 *
 * The chat's own list, under `delivery_manage:read`: the driver search it
 * replaces needs `driver_manage:read`, so a tower user who could send saw
 * both pickers empty.
 */
const listChatRecipients = async ({
  businessId,
  search,
  app,
  cursor,
  limit = 20,
}: ListChatRecipientsProps): Promise<
  ActionResponse<ListChatRecipientsData>
> => {
  try {
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    const query = new URLSearchParams({
      limit: String(limit),
      ...(search && { search }),
      ...(app && { app }),
      ...(cursor && { cursor }),
      ...(businessId && { businessId }),
    });

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/chat/recipients?${query.toString()}`,
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
        message: result.message || "Houve um erro ao carregar os motoristas.",
      };
    }

    return {
      success: true,
      message: "Motoristas carregados.",
      data: {
        data: (result.data ?? []) as ChatRecipient[],
        nextCursor: result.nextCursor ?? null,
        hasMore: Boolean(result.hasMore),
        audience: result.audience ?? null,
      },
    };
  } catch (error) {
    logActionError("chat/list-chat-recipients", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar os motoristas.",
    };
  }
};

export { listChatRecipients };
export type { ListChatRecipientsData };
