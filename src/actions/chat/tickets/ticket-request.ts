// Helper of the ticket actions, not an action: never bundled for the browser.
import "server-only";

import { logActionError } from "@/lib/log-action-error";
import { classifyAccessError } from "@/lib/access-error";
import { getCookies } from "../../cookies";

import type { ActionResponse } from "../chat.types";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The one request path of the ticket actions (decision 14.5).
 *
 * Every refusal comes back as a value, never a rejection: the cookie read and
 * the fetch both sit inside the try (the lesson of list-chat-messages). The
 * API's body rides along as `details` so a 409 can say who closed the ticket
 * or who holds it now, and a 403 is classified by its code (decision 4.1).
 */
interface TicketRequestFailure {
  code: string | null;
  details: Record<string, unknown>;
}

type TicketActionResponse<T> = ActionResponse<T> & {
  failure?: TicketRequestFailure;
};

async function ticketRequest<T>(input: {
  path: string;
  method?: "GET" | "POST" | "PUT";
  body?: Record<string, unknown>;
  query?: Record<string, string | number | undefined | null>;
  idempotencyKey?: string;
  logName: string;
  successMessage: string;
  errorMessage: string;
}): Promise<TicketActionResponse<T>> {
  try {
    const tokenAccess = await getCookies("tkey");

    if (!tokenAccess) {
      return {
        success: false,
        message: "Token de acesso não encontrado. Faça login novamente.",
      };
    }

    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(input.query ?? {})) {
      if (value !== undefined && value !== null && value !== "")
        query.set(key, String(value));
    }

    const suffix = query.toString() ? `?${query.toString()}` : "";

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}${input.path}${suffix}`,
      {
        credentials: "include",
        method: input.method ?? "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
          ...(input.idempotencyKey && {
            "Idempotency-Key": input.idempotencyKey,
          }),
        },
        ...(input.body && { body: JSON.stringify(input.body) }),
        cache: "no-store",
      },
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const record = (result ?? {}) as Record<string, unknown>;

      return {
        success: false,
        message:
          typeof record.message === "string"
            ? record.message
            : input.errorMessage,
        accessError: classifyAccessError(response.status, record),
        failure: {
          code: typeof record.code === "string" ? record.code : null,
          details: record,
        },
      };
    }

    return { success: true, message: input.successMessage, data: result as T };
  } catch (error) {
    logActionError(input.logName, error);

    return { success: false, message: input.errorMessage };
  }
}

export { ticketRequest };
export type { TicketActionResponse, TicketRequestFailure };
