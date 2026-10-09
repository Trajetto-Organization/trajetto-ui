"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The tower's authorization of a driver's occurrence (decision 6.3): the
 * queue of requests waiting, and the decision on one.
 *
 * A refusal carries the API's `code` and status: a 409 OCCURRENCE_ALREADY_DECIDED
 * comes with the decision that stands, so the screen says who decided what
 * instead of "tente novamente".
 */

interface PendingAuthorization {
  id: string;
  deliveryId: string;
  occurrenceTypeId: string;
  occurrenceType: { id: string; name: string; blocks_delivery: boolean };
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Signed URLs, short-lived. */
  photos: string[];
  /**
   * Decision 14.3: DELIVERED asks to PROVE the delivery with the receipt and
   * signature below. Optional: an API older than the field omits it.
   */
  category?: "DELIVERED" | "NOT_DELIVERED" | "PAUSE";
  /** Signed URL of the receipt photo ("canhoto"), or null. */
  receipt_photo_url?: string | null;
  /** Signed URL of the on-screen signature, or null. */
  signature_url?: string | null;
  /** Who received, as the driver typed it (delivery requests only). */
  received_by?: string | null;
  form_answers: Record<string, string | number | boolean | null> | null;
  form_version: number | null;
  /** Already labelled and formatted by the API, in the form's order. */
  answers: Array<{ label: string; value: string }>;
  reportedBy: { id: string; name: string };
  occurred_at: string | null;
  created_at: string;
  escalated_at: string | null;
  escalates_at: string;
  delivery: {
    id: string;
    code: string | null;
    invoice_number: string | null;
    recipient_name: string;
    street: string;
    address_number: string | null;
    neighborhood: string | null;
    city: string;
    uf: string;
    status: string;
    driver: { id: string; name: string } | null;
  };
}

interface PendingAuthorizationsData {
  data: PendingAuthorization[];
  total: number;
  /** The company the API answered for (the session's, or the MASTER's pick). */
  businessId: string;
}

interface SettledDecision {
  status: "APPROVED" | "DENIED" | "SUPERSEDED";
  authorizedBy: { id: string; name: string } | null;
  authorized_at: string | null;
  note: string | null;
}

interface DecisionResult {
  id: string;
  deliveryId: string;
  authorization_status: "APPROVED" | "DENIED";
  authorized_at: string;
  authorizedBy: { id: string; name: string };
  authorization_note: string | null;
  deliveryStatus: string;
  replayed: boolean;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
  /** 409 OCCURRENCE_ALREADY_DECIDED: the decision that stands. */
  decision?: SettledDecision;
}

const NO_TOKEN = {
  success: false as const,
  message: "Token de acesso não encontrado. Faça login novamente.",
  code: "UNAUTHENTICATED",
  status: 401,
};

const listPendingAuthorizations = async (
  businessId?: string,
): Promise<ActionResponse<PendingAuthorizationsData>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const params = new URLSearchParams();

    if (businessId) params.set("businessId", businessId);

    const query = params.toString();

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/occurrence-authorizations${query ? `?${query}` : ""}`,
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

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message ||
          "Houve um erro ao carregar os pedidos de autorização.",
        code: typeof result.code === "string" ? result.code : undefined,
        status: response.status,
      };
    }

    return {
      success: true,
      message: "Pedidos de autorização obtidos com sucesso.",
      data: result as PendingAuthorizationsData,
    };
  } catch (error) {
    logActionError("delivery/occurrence-authorizations/list", error);

    return {
      success: false,
      message:
        "Ocorreu um erro inesperado ao carregar os pedidos de autorização.",
    };
  }
};

const decideOccurrenceAuthorization = async (
  businessId: string,
  occurrenceId: string,
  decision: "APPROVED" | "DENIED",
  note?: string,
): Promise<ActionResponse<DecisionResult>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/occurrence-authorization/${encodeURIComponent(occurrenceId)}/business/${encodeURIComponent(businessId)}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
      },
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao registrar a decisão.",
        code: typeof result.code === "string" ? result.code : undefined,
        status: response.status,
        decision: result.decision as SettledDecision | undefined,
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data as DecisionResult,
    };
  } catch (error) {
    logActionError("delivery/occurrence-authorizations/decide", error);

    return {
      success: false,
      message: "Ocorreu um erro inesperado ao registrar a decisão.",
    };
  }
};

export { decideOccurrenceAuthorization, listPendingAuthorizations };
export type {
  ActionResponse as OccurrenceAuthorizationActionResponse,
  DecisionResult,
  PendingAuthorization,
  PendingAuthorizationsData,
  SettledDecision,
};
