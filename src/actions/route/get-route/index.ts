"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "@/actions/cookies";

import type {
  RouteStatus,
  RouteStopStatus,
} from "@/features/routes/lib/status";
import { apiFetch } from "@/lib/api-fetch";

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

  /** NF and code, for the stop list. Optional: older APIs omit them. */
  code?: string | null;
  invoice_number?: string | null;

  /**
   * Where the ADDRESS is, for the route map (decision 14.7, D7): pinned by a
   * dispatcher ("MANUAL") or resolved by a geocoder. Null = sem localização.
   */
  latitude?: number | null;
  longitude?: number | null;
  geo_source?: "MANUAL" | "GEOCODER" | null;
}

interface RouteStop {
  id: string;

  /** Manual order, spaced by ten. Never shown raw — the position is. */
  sequence: number;
  status: RouteStopStatus;

  /**
   * Last time the driver said they were heading here (decision 6.4). Only
   * the route's latest mark, on a stop still PENDING, is "a caminho" — see
   * currentOnTheWayStopId. Optional: an API before 6.4 does not send it.
   */
  on_the_way_at?: string | null;

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

  /** A civil day, served as UTC midnight: format with formatDateOnly. */
  scheduled_date: string;

  /** Where the route is headed, free text (decision 6.5). */
  destination: string | null;

  /** Instants with offset; shown in the browser's zone. */
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

  /**
   * The plan's version (decision 14.7, D5): sent back as
   * `expectedPlanVersion` so a colleague's change is never overwritten.
   * Optional: an API before 14.7 does not send it.
   */
  plan_version?: number;

  /** When it was handed to the driver; null while a draft. */
  released_at?: string | null;

  created_at: string;
  updated_at: string;
}

/** The driver's dot on THIS route, from the last read (§4.2). */
interface RouteDriverPosition {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
  fresh: boolean;
}

/** GPS captured at a stop (arrival or proof). */
interface RouteVisitedPoint {
  deliveryId: string;
  type: "ARRIVAL" | "PROOF";
  latitude: number;
  longitude: number;
  recordedAt: string;
}

interface RouteDetail extends RouteListItem {
  /** Only on the detail read, for the route page's map. */
  driverPosition?: RouteDriverPosition | null;
  visitedPoints?: RouteVisitedPoint[];
}

interface RouteDetailResult {
  route: RouteDetail;
  progress: { done: number; total: number };
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;

  /** The API's `code` on a refusal (ROUTE_PLAN_STALE, …), when it sent one. */
  code?: string;
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
    const response = await apiFetch(
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
    logActionError("route/get-route", error);
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
  RouteDriverPosition,
  RouteVisitedPoint,
  RouteDetailResult,
  RouteListItem,
  RouteStop,
  RouteStopDelivery,
};
