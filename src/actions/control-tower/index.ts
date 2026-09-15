"use server";

import { getCookies } from "../cookies";

interface TowerPosition {
  driverId: string;
  driverName: string | null;

  routeId: string | null;
  routeCode: number | null;

  vehiclePlate: string | null;

  latitude: number;
  longitude: number;

  speed: number | null;
  heading: number | null;
  battery: number | null;

  recordedAt: string;

  /** Whether the dot still means "where they are" or "where they were". */
  fresh: boolean;
}

interface TowerEvent {
  id: string;
  type: string;
  actor: string;

  deliveryId: string;
  recipientName: string | null;

  driverName: string | null;

  occurredAt: string;
}

interface ControlTowerData {
  positions: TowerPosition[];

  funnel: Array<{ status: string; label: string; total: number }>;
  progress: { finished: number; total: number; rate: number | null };

  punctuality: {
    onTime: number;
    late: number;
    notDeparted: number;
    notPlanned: number;

    /** Null when nothing was planned — not 100%. */
    rate: number | null;
  };

  events: TowerEvent[];
}

interface TrailPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  recordedAt: string;
}

interface DriverTrail {
  driverId: string;
  day: string;

  /** How many points exist, before thinning. The screen says so. */
  recorded: number;

  points: TrailPoint[];
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const NO_TOKEN = {
  success: false as const,
  message: "Token de acesso não encontrado. Faça login novamente.",
};

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
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const params = new URLSearchParams();

    if (businessId) params.set("businessId", businessId);

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/route/control-tower?${params}`,
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
        message: result.message || "Houve um erro ao carregar a torre.",
      };
    }

    return {
      success: true,
      message: "Torre obtida com sucesso.",
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar a torre.",
    };
  }
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
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) return NO_TOKEN;

  try {
    const params = new URLSearchParams();

    if (options.businessId) params.set("businessId", options.businessId);
    if (options.day) params.set("day", options.day);

    const response = await fetch(
      `${process.env.HTTP_REQUEST}/route/driver-trail/${driverId}?${params}`,
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
        message: result.message || "Houve um erro ao carregar o trajeto.",
      };
    }

    return {
      success: true,
      message: "Trajeto obtido com sucesso.",
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar o trajeto.",
    };
  }
};

export { getControlTower, getDriverTrail };

export type {
  ControlTowerData,
  DriverTrail,
  TowerEvent,
  TowerPosition,
  TrailPoint,
};
