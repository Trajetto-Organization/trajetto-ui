"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "@/actions/cookies";
import { parseNDJSON } from "@/lib/parse-nd-json";

import type { ActionResponse } from "@/actions/route/get-route";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The imperative half of the route module: the acts that are not a form.
 *
 * Grouped in one file because they share everything that matters — the same
 * token, the same envelope, the same way of surfacing a refusal — and differ
 * only in a verb and a URL. Split across six folders, the next person fixing
 * how a 409 reaches the screen would have to find and change six copies.
 *
 * Every one of them returns the API's own message and its `code`. The route
 * module answers 409 for "somebody got there first" on almost every write;
 * the code tells the page which one (ROUTE_PLAN_STALE reloads the plan).
 */
async function call<T = undefined>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown> | undefined,
  fallback: string,
): Promise<ActionResponse<T> & { meta?: unknown }> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(`${process.env.HTTP_REQUEST}${path}`, {
      credentials: "include",
      method,
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      ...(body && { body: JSON.stringify(body) }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        message: result.message || fallback,
        ...(typeof result.code === "string" && { code: result.code }),
      };
    }

    return {
      success: true,
      message: result.message ?? "",
      data: result.data as T,
      ...(result.meta !== undefined && { meta: result.meta }),
    };
  } catch (error) {
    logActionError("route/route-operations", error);
    return { success: false, message: fallback };
  }
}

/** What every plan write answers (decision 14.7, D5). */
interface PlanAnswer {
  planVersion: number;
}

interface ReleaseAnswer extends PlanAnswer {
  /** Already in that state: nothing written. */
  unchanged: boolean;
  status: string;
}

/** Hands the route to its driver, or pulls it back to planning. */
const releaseRoute = (
  businessId: string,
  routeId: string,
  released: boolean,
  expectedPlanVersion?: number,
): Promise<ActionResponse<ReleaseAnswer>> =>
  call(
    `/route/release-route/${routeId}/business/${businessId}`,
    "PATCH",
    {
      released,
      ...(expectedPlanVersion !== undefined && { expectedPlanVersion }),
    },
    released
      ? "Não foi possível liberar a rota."
      : "Não foi possível devolver a rota ao planejamento.",
  );

const cancelRoute = (
  businessId: string,
  routeId: string,
  reason: string,
): Promise<ActionResponse> =>
  call(
    `/route/cancel-route/${routeId}/business/${businessId}`,
    "PATCH",
    { reason },
    "Não foi possível cancelar a rota.",
  );

interface StopsAdded extends PlanAnswer {
  added: number;
  stopIds: string[];
  /** Already stops of this route: a retry, answered as success. */
  alreadyOnRoute: string[];
}

const addRouteStops = (
  businessId: string,
  routeId: string,
  deliveryIds: string[],
  expectedPlanVersion?: number,
): Promise<ActionResponse<StopsAdded>> =>
  call(
    `/route/add-stops/${routeId}/business/${businessId}`,
    "POST",
    {
      deliveryIds,
      ...(expectedPlanVersion !== undefined && { expectedPlanVersion }),
    },
    "Não foi possível adicionar as paradas.",
  );

interface StopsMoved extends StopsAdded {
  moved: Array<{
    deliveryId: string;
    fromRouteId: string;
    fromRouteCode: number;
  }>;
  /** Codes of the released routes left empty, and so cancelled. */
  cancelledRoutes: number[];
}

/**
 * Brings deliveries to this route from wherever they are — another route
 * that has not left, or none — in one transaction on the API (D10).
 */
const moveRouteStops = (
  businessId: string,
  routeId: string,
  deliveryIds: string[],
  expectedPlanVersion?: number,
): Promise<ActionResponse<StopsMoved>> =>
  call(
    `/route/move-stops/${routeId}/business/${businessId}`,
    "POST",
    {
      deliveryIds,
      ...(expectedPlanVersion !== undefined && { expectedPlanVersion }),
    },
    "Não foi possível adicionar as entregas à rota.",
  );

interface StopsRemoved extends PlanAnswer {
  removed: string[];
  alreadyGone: string[];
  /** No open stop left: the page offers to unrelease or cancel. */
  routeEmptied: boolean;
}

const removeRouteStops = (
  businessId: string,
  routeId: string,
  stopIds: string[],
  expectedPlanVersion?: number,
): Promise<ActionResponse<StopsRemoved>> =>
  call(
    `/route/remove-stops/${routeId}/business/${businessId}`,
    "POST",
    {
      stopIds,
      ...(expectedPlanVersion !== undefined && { expectedPlanVersion }),
    },
    "Não foi possível remover as paradas.",
  );

/**
 * Sends the COMPLETE order, not a move.
 *
 * A move instruction applied to a route a colleague has since changed
 * silently produces an order nobody asked for. The full list either describes
 * the route as it is, or describes one that no longer exists — and the API
 * refuses the second with 409 so the dispatcher refreshes and redoes it.
 */
const reorderRouteStops = (
  businessId: string,
  routeId: string,
  orderedStopIds: string[],
  expectedPlanVersion?: number,
): Promise<ActionResponse<PlanAnswer>> =>
  call(
    `/route/reorder-stops/${routeId}/business/${businessId}`,
    "PATCH",
    {
      orderedStopIds,
      ...(expectedPlanVersion !== undefined && { expectedPlanVersion }),
    },
    "Não foi possível salvar a nova ordem.",
  );

interface PinnedLocation {
  id: string;
  latitude: number | null;
  longitude: number | null;
  geo_source: "MANUAL" | "GEOCODER" | null;

  /** The route holding the delivery, and the plan version the pin produced. */
  routeId: string | null;
  planVersion: number | null;
}

/** "Fixar no mapa": where the delivery's address is (D7); null clears it. */
const setDeliveryLocation = (
  businessId: string,
  deliveryId: string,
  point: { latitude: number; longitude: number } | null,
): Promise<ActionResponse<PinnedLocation>> =>
  call(
    `/route/set-delivery-location/${deliveryId}/business/${businessId}`,
    "PATCH",
    point ?? { clear: true },
    "Não foi possível fixar a entrega no mapa.",
  );

interface UnroutedDelivery {
  id: string;
  code: string | null;
  kind: string;
  invoice_number: string | null;
  recipient_name: string;
  street: string;
  address_number: string | null;
  neighborhood: string | null;
  city: string;
  uf: string;
  /** A civil day (UTC midnight), or null. */
  scheduled_date: string | null;
  latitude: number | null;
  longitude: number | null;
  shipper: { id: string; name: string } | null;
}

interface FacetCount {
  value: string;
  count: number;

  /** The shipper facet: the name to show (the value is the id). */
  label?: string;
}

interface UnroutedPage {
  data: UnroutedDelivery[];
  total: number;
  facets: {
    city: FacetCount[];
    uf: FacetCount[];
    kind: FacetCount[];
    shipper: FacetCount[];
  };
}

interface UnroutedQuery {
  page: number;
  pageSize: number;
  search?: string;
  shipperIds?: string[];
  cities?: string[];
  ufs?: string[];
  kinds?: string[];
  /** "YYYY-MM-DD". */
  scheduledFrom?: string;
  scheduledTo?: string;
  includeUnscheduled?: boolean;
}

/**
 * The "Adicionar entregas" picker (decision 14.7, §5.5): PENDING deliveries
 * on no open stop, searched and filtered on the server.
 */
const listUnroutedDeliveries = async (
  businessId: string,
  query: UnroutedQuery,
): Promise<ActionResponse<UnroutedPage>> => {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.shipperIds?.length)
    params.set("shipperIds", query.shipperIds.join(","));
  if (query.cities?.length) params.set("cities", query.cities.join(","));
  if (query.ufs?.length) params.set("ufs", query.ufs.join(","));
  if (query.kinds?.length) params.set("kinds", query.kinds.join(","));
  if (query.scheduledFrom) params.set("scheduledFrom", query.scheduledFrom);
  if (query.scheduledTo) params.set("scheduledTo", query.scheduledTo);

  if (query.includeUnscheduled !== undefined) {
    params.set("includeUnscheduled", String(query.includeUnscheduled));
  }

  const answer = await call<UnroutedDelivery[]>(
    `/route/unrouted-deliveries/${businessId}?${params.toString()}`,
    "GET",
    undefined,
    "Não foi possível carregar as entregas sem rota.",
  );

  if (!answer.success) {
    return { success: false, message: answer.message, code: answer.code };
  }

  const meta = (answer.meta ?? {}) as {
    total?: number;
    facets?: UnroutedPage["facets"];
  };

  return {
    success: true,
    message: "",
    data: {
      data: answer.data ?? [],
      total: meta.total ?? 0,
      facets: {
        city: meta.facets?.city ?? [],
        uf: meta.facets?.uf ?? [],
        kind: meta.facets?.kind ?? [],
        shipper: meta.facets?.shipper ?? [],
      },
    },
  };
};

interface OpenStop {
  deliveryId: string;
  stopId: string;
  routeId: string;
  routeCode: number;
  routeStatus: string;
}

/** Which route holds each delivery of a selection (the table's dialog). */
const listOpenStops = (
  businessId: string,
  deliveryIds: string[],
): Promise<ActionResponse<OpenStop[]>> =>
  call(
    `/route/open-stops/${businessId}?deliveryIds=${deliveryIds.join(",")}`,
    "GET",
    undefined,
    "Não foi possível verificar em que rota estão as entregas.",
  );

interface RouteTrail {
  recorded: number;
  points: Array<{ latitude: number; longitude: number; recordedAt: string }>;
}

/** The trail of THIS route, departure to end (§4.12). */
const getRouteTrail = (
  businessId: string,
  driverId: string,
  routeId: string,
): Promise<ActionResponse<RouteTrail>> =>
  call(
    `/route/driver-trail/${driverId}?routeId=${routeId}&businessId=${businessId}`,
    "GET",
    undefined,
    "Não foi possível carregar o trajeto da rota.",
  );

interface OpenRouteOption {
  id: string;
  code: number;
  name: string | null;
  status: string;
  scheduled_date: string;
  destination: string | null;
  driver: { id: string; name: string } | null;
  vehicle: { id: string; license_plate: string } | null;
  stopCount: number;
}

/**
 * The routes a selection can still join: PLANNED and RELEASED, searched on
 * the server (decision 14.7, §5.6), 20 at a time. The board's own listing,
 * so the search reads the same fields there and here.
 */
const listOpenRoutes = async (
  businessId: string,
  search: string,
  page: number,
): Promise<ActionResponse<{ data: OpenRouteOption[]; total: number }>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    status: "PLANNED,RELEASED",
    sort: "scheduled_date",
    order: "asc",
    businessId,
  });

  if (search.trim()) params.set("search", search.trim());

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/route/list-routes?${params.toString()}`,
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

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      return {
        success: false,
        message: result.message || "Não foi possível carregar as rotas.",
        ...(typeof result.code === "string" && { code: result.code }),
      };
    }

    // NDJSON: an envelope line, then one route per line.
    const { meta, data } = await parseNDJSON(response);

    const rows = (
      data as Array<
        Omit<OpenRouteOption, "stopCount"> & {
          stops?: Array<{ status: string }>;
        }
      >
    ).map(({ stops, ...route }) => ({
      id: route.id,
      code: route.code,
      name: route.name ?? null,
      status: route.status,
      scheduled_date: route.scheduled_date,
      destination: route.destination ?? null,
      driver: route.driver ?? null,
      vehicle: route.vehicle ?? null,
      stopCount: (stops ?? []).filter(
        (stop) => stop.status === "PENDING" || stop.status === "ARRIVED",
      ).length,
    }));

    return {
      success: true,
      message: "",
      data: { data: rows, total: Number(meta?.total ?? rows.length) },
    };
  } catch (error) {
    logActionError("route/list-open-routes", error);
    return { success: false, message: "Não foi possível carregar as rotas." };
  }
};

export {
  listOpenRoutes,
  addRouteStops,
  cancelRoute,
  getRouteTrail,
  listOpenStops,
  listUnroutedDeliveries,
  moveRouteStops,
  releaseRoute,
  removeRouteStops,
  reorderRouteStops,
  setDeliveryLocation,
};
export type {
  OpenRouteOption,
  FacetCount,
  OpenStop,
  PinnedLocation,
  ReleaseAnswer,
  RouteTrail,
  StopsAdded,
  StopsMoved,
  StopsRemoved,
  UnroutedDelivery,
  UnroutedPage,
  UnroutedQuery,
};
