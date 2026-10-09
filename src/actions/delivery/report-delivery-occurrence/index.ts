"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  /** OCCURRENCE_FORM_INVALID / OUTDATED: the problem per form field key. */
  fieldErrors?: Record<string, string>;
}

interface ReportedOccurrence {
  id: string;
  /** NOT_REQUIRED, PENDING, APPROVED or SUPERSEDED (decision 6.3). */
  authorization_status: string;
  replayed: boolean;
}

const reportDeliveryOccurrence = async (
  businessId: string,
  deliveryId: string,
  occurrence: {
    occurrenceTypeId: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    /**
     * One per occurrence form (IDEMP-14), the key the driver's app already
     * sends: saving the same form again after a lost answer is the same
     * occurrence, not a second one with a second alert.
     */
    client_submission_id?: string;
    /** Decision 6.2: the answers to the type's form, by field key. */
    form_answers?: Record<string, string | number | boolean>;
    /** The form_version the panel rendered. */
    form_version?: number;
  },
): Promise<ActionResponse<ReportedOccurrence>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/report-occurrence/${deliveryId}/business/${businessId}`,
      {
        credentials: "include",
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(occurrence),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao registrar a ocorrência.",
        code: typeof result.code === "string" ? result.code : undefined,
        fieldErrors:
          result.field_errors && typeof result.field_errors === "object"
            ? (result.field_errors as Record<string, string>)
            : undefined,
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data as ReportedOccurrence | undefined,
    };
  } catch (error) {
    logActionError("delivery/report-delivery-occurrence", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao registrar a ocorrência.",
    };
  }
};

export { reportDeliveryOccurrence };
