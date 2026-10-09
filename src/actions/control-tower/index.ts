"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../cookies";

import type {
  ControlTowerData,
  DriverMonitoringData,
  DriverTrail,
  RouteMonitoringData,
} from "./types";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The answer of every action here.
 *
 * A refusal carries the API's `code` (PERMISSION_DENIED, MODULE_NOT_ENABLED,
 * TENANT_INACTIVE…) and the HTTP status, so the screen can tell "módulo não
 * contratado" from "sem permissão" from "a API caiu" instead of drawing all
 * three as an empty map (UI-TWR-1).
 */
interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
}

const NO_TOKEN = {
  success: false as const,
  message: "Token de acesso não encontrado. Faça login novamente.",
  code: "UNAUTHENTICATED",
  status: 401,
};

/** One GET against the API, answered in the shape above. */
async function read<T>(
  path: string,
  params: URLSearchParams,
  messages: { failed: string; ok: string; unexpected: string; source: string },
): Promise<ActionResponse<T>> {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const query = params.toString();

    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}${path}${query ? `?${query}` : ""}`,
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
        message: result.message || messages.failed,
        code: typeof result.code === "string" ? result.code : undefined,
        status: response.status,
      };
    }

    return { success: true, message: messages.ok, data: result.data };
  } catch (error) {
    logActionError(messages.source, error);

    return { success: false, message: messages.unexpected };
  }
}

/**
 * Everything the tower draws, in one request.
 *
 * One call and not five: the panel refreshes all of it together, and five
 * requests on a timer is five times the connections for a screen a dispatcher
 * leaves open all day.
 */
const getControlTower = async (
  businessId?: string,
): Promise<ActionResponse<ControlTowerData>> => {
  const params = new URLSearchParams();

  if (businessId) params.set("businessId", businessId);

  return read<ControlTowerData>("/route/control-tower", params, {
    failed: "Houve um erro ao carregar a torre.",
    ok: "Torre obtida com sucesso.",
    unexpected: "Ocorreu um erro inesperado ao carregar a torre.",
    source: "control-tower/getControlTower",
  });
};

/**
 * Where one driver went on one day.
 *
 * Asked for only when somebody opens a driver, never on the tower's refresh:
 * fetching every driver's whole day every few seconds would be the heaviest
 * query in the product serving decoration.
 */
const getDriverTrail = async (
  driverId: string,
  options: { businessId?: string; day?: string } = {},
): Promise<ActionResponse<DriverTrail>> => {
  const params = new URLSearchParams();

  if (options.businessId) params.set("businessId", options.businessId);
  if (options.day) params.set("day", options.day);

  return read<DriverTrail>(
    `/route/driver-trail/${encodeURIComponent(driverId)}`,
    params,
    {
      failed: "Houve um erro ao carregar o trajeto.",
      ok: "Trajeto obtido com sucesso.",
      unexpected: "Ocorreu um erro inesperado ao carregar o trajeto.",
      source: "control-tower/getDriverTrail",
    },
  );
};

/**
 * The monitoring board by route (decision 6.6): the company's routes of the
 * day, each with its stops, a page at a time.
 */
const getRouteMonitoring = async (
  options: { businessId?: string; page?: number; pageSize?: number } = {},
): Promise<ActionResponse<RouteMonitoringData>> => {
  const params = new URLSearchParams();

  if (options.businessId) params.set("businessId", options.businessId);
  if (options.page) params.set("page", String(options.page));
  if (options.pageSize) params.set("pageSize", String(options.pageSize));

  return read<RouteMonitoringData>("/route/monitoring", params, {
    failed: "Houve um erro ao carregar o monitoramento por rota.",
    ok: "Monitoramento obtido com sucesso.",
    unexpected:
      "Ocorreu um erro inesperado ao carregar o monitoramento por rota.",
    source: "control-tower/getRouteMonitoring",
  });
};

/**
 * The monitoring board by driver: the day's active documents of each driver,
 * on the tower's definition of the day (decision 7.1).
 */
const getDriverMonitoring = async (
  options: { businessId?: string } = {},
): Promise<ActionResponse<DriverMonitoringData>> => {
  const params = new URLSearchParams();

  if (options.businessId) params.set("businessId", options.businessId);

  return read<DriverMonitoringData>("/route/monitoring/drivers", params, {
    failed: "Houve um erro ao carregar o monitoramento por motorista.",
    ok: "Monitoramento obtido com sucesso.",
    unexpected:
      "Ocorreu um erro inesperado ao carregar o monitoramento por motorista.",
    source: "control-tower/getDriverMonitoring",
  });
};

export {
  getControlTower,
  getDriverMonitoring,
  getDriverTrail,
  getRouteMonitoring,
};

export type { ActionResponse };
export type {
  ControlTowerData,
  DriverDayRow,
  DriverMonitoringData,
  DriverTrail,
  MonitoredRoute,
  MonitoredStop,
  RouteMonitoringData,
  TowerActiveRoute,
  TowerEvent,
  TowerPosition,
  TrailPoint,
} from "./types";
