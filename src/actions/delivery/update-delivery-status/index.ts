"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";

import type { DeliveryStatus } from "../get-delivery";
import { apiFetch } from "@/lib/api-fetch";
import { revalidateTagName } from "@/actions/revalidate";

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

interface StatusOverride {
  /**
   * Required by the API, and this is the one endpoint in the module that
   * demands it.
   *
   * Everything the driver's app does carries its own evidence — a photo, a
   * geolocation, a typed occurrence. Moving a status by hand from the panel
   * carries none, so the reason IS the evidence, and three days later it is
   * the only thing support has to answer "por que essa está assim?".
   */
  reasonId: string;

  /** The detail the catalogue cannot carry: "cliente ligou às 14h". */
  note?: string;

  /** Only meaningful on DELIVERED. */
  receivedBy?: string;
}

const updateDeliveryStatus = async (
  businessId: string,
  deliveryId: string,
  status: DeliveryStatus,
  override: StatusOverride,
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
      `${process.env.HTTP_REQUEST}/delivery/update-delivery-status/${deliveryId}/business/${businessId}`,
      {
        credentials: "include",
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          reasonId: override.reasonId,
          ...(override.note && { note: override.note }),
          ...(override.receivedBy && { received_by: override.receivedBy }),
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message:
          result.message || "Houve um erro ao mudar o status da entrega.",
      };
    }

    // Re-renders the screen in this same response: the client no longer
    // asks for it in a second request.
    await revalidateTagName("update-delivery");

    return { success: true, message: result.message };
  } catch (error) {
    logActionError("delivery/update-delivery-status", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao mudar o status da entrega.",
    };
  }
};

export { updateDeliveryStatus };
export type { StatusOverride };
