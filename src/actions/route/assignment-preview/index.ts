"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "@/actions/cookies";

import type { ActionResponse } from "@/actions/route/get-route";
import { apiFetch } from "@/lib/api-fetch";

interface AssignmentVehicle {
  id: string;
  license_plate: string;
  description: string | null;
  /** ACTIVE, IN_ROUTE, INACTIVE or BLOCKED. */
  status: string;
}

interface AssignmentWarning {
  code: string;
  message: string;
}

/** GET /route/assignment-preview — what the pair already has (FLEET-ASSIGN-2). */
interface AssignmentPreview {
  scheduled_date: string;
  /**
   * The company's zone (IANA): the forms read "the departure is on the
   * route's day" in it, as the API does.
   */
  timeZone: string;
  driver: { id: string; name: string; status: string };
  responsibleVehicles: AssignmentVehicle[];
  /** The driver's only responsible vehicle, to preselect; null otherwise. */
  suggestedVehicleId: string | null;
  vehicle:
    | (AssignmentVehicle & { responsible: { id: string; name: string } | null })
    | null;
  warnings: AssignmentWarning[];
}

interface AssignmentPreviewParams {
  businessId: string;
  driverId: string;
  vehicleId?: string | null;
  /** "YYYY-MM-DD"; the company's today when absent. */
  scheduledDate?: string | null;
  /** The route being edited, so it is not a conflict with itself. */
  excludeRouteId?: string | null;
  /**
   * The batch assignment's selection: a released route it empties (and so
   * cancels) is not a conflict.
   */
  deliveryIds?: string[];
}

/**
 * Reads what a driver/vehicle pair already has before the dispatcher
 * confirms it: the driver's own vehicle to preselect, who is responsible for
 * the chosen one and the routes either already holds. Warnings only — the
 * dialogs never block on them.
 */
const getAssignmentPreview = async ({
  businessId,
  driverId,
  vehicleId,
  scheduledDate,
  excludeRouteId,
  deliveryIds,
}: AssignmentPreviewParams): Promise<ActionResponse<AssignmentPreview>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const query = new URLSearchParams({ driverId });

  if (vehicleId) query.set("vehicleId", vehicleId);
  if (scheduledDate) query.set("scheduled_date", scheduledDate);
  if (excludeRouteId) query.set("excludeRouteId", excludeRouteId);
  if (deliveryIds?.length) query.set("deliveryIds", deliveryIds.join(","));

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/route/assignment-preview/${businessId}?${query.toString()}`,
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
          "Não foi possível verificar o motorista e o veículo.",
      };
    }

    return {
      success: true,
      message: "",
      data: result.data as AssignmentPreview,
    };
  } catch (error) {
    logActionError("route/assignment-preview", error);
    return {
      success: false,
      message: "Não foi possível verificar o motorista e o veículo.",
    };
  }
};

export { getAssignmentPreview };
export type {
  AssignmentPreview,
  AssignmentPreviewParams,
  AssignmentVehicle,
  AssignmentWarning,
};
