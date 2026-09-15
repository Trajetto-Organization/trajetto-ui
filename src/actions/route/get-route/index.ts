"use server";

import { getCookies } from "@/actions/cookies";

import type {
  RouteStatus,
  RouteStopStatus,
} from "@/features/routes/lib/status";

/**
 * The route module's types live here, next to the read that produces them —
 * the same arrangement `get-delivery` uses, so everything downstream (table
 * columns, dialogs, row actions) imports its shapes from one place.
 */
interface RouteStopDelivery {
  id: string;
  kind: string;
  status: string;
  recipient_name: string;
  city: string;
  uf: string;
  street: string;
  address_number: string | null;
  neighborhood: string | null;
}

interface RouteStop {
  id: string;

  /** Manual order, spaced by ten. Never shown raw — the position is. */
  sequence: number;
  status: RouteStopStatus;

  arrived_at: string | null;
  completed_at: string | null;

  routeId: string;
  deliveryId: string;
  delivery: RouteStopDelivery;
}

interface RouteListItem {
  id: string;

  /** Sequential per company — what everybody quotes on the phone. */
  code: number;
  name: string | null;

  status: RouteStatus;

  scheduled_date: string;
  planned_departure_at: string | null;
  planned_arrival_at: string | null;

  started_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;

  driverId: string;
  vehicleId: string | null;

  driver: { id: string; name: string } | null;
  vehicle: { id: string; license_plate: string } | null;

  stops: RouteStop[];

  created_at: string;
  updated_at: string;
}

type RouteDetail = RouteListItem;

interface RouteDetailResult {
  route: RouteDetail;
  progress: { done: number; total: number };
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const getRoute = async (
  businessId: string,
  routeId: string,
): Promise<ActionResponse<RouteDetailResult>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await fetch(
      `${process.env.HTTP_REQUEST}/route/get-route/${routeId}/business/${businessId}`,
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
        message: result.message || "Houve um erro ao carregar a rota.",
      };
    }

    return {
      success: true,
      message: "Rota carregada com sucesso.",
      data: {
        route: result.data as RouteDetail,
        progress: result.meta?.progress ?? { done: 0, total: 0 },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar a rota.",
    };
  }
};

export { getRoute };
export type {
  ActionResponse,
  RouteDetail,
  RouteDetailResult,
  RouteListItem,
  RouteStop,
  RouteStopDelivery,
};
