/**
 * What the tower and the monitoring board read from the API, as the API
 * documents it (control-tower-documentation.ts). Kept out of the "use server"
 * module so client components import shapes without importing actions.
 */

/**
 * - `moving`: the route runs and the phone reported in the last ten minutes;
 * - `silent`: the route runs and the phone went quiet;
 * - `ended`: the route finished (or was cancelled) under two hours ago.
 */
type TowerVehicleState = "moving" | "silent" | "ended";

interface TowerPosition {
  driverId: string;
  driverName: string | null;

  routeId: string | null;
  routeCode: number | null;
  routeStatus?: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

  vehiclePlate: string | null;

  latitude: number;
  longitude: number;

  speed: number | null;
  heading: number | null;
  battery: number | null;

  recordedAt: string;

  /** Whether the dot still means "where they are" or "where they were". */
  fresh: boolean;

  state?: TowerVehicleState;

  /** When the route ended, for "concluída às HH:mm". */
  endedAt?: string | null;

  /** When the driver's open pause started (running routes only); null when not paused. */
  pausedSince?: string | null;
}

/** A route on the street, with or without a dot on the map. */
interface TowerActiveRoute {
  routeId: string;
  routeCode: number;
  routeName: string | null;
  destination: string | null;

  driverId: string;
  driverName: string | null;
  vehiclePlate: string | null;

  startedAt: string | null;

  /** The phone's last point, however old; null: it never reported. */
  lastSignalAt: string | null;

  progress: { resolved: number; total: number };
}

interface TowerEvent {
  id: string;
  source?: "delivery_event" | "occurrence" | "route";

  /**
   * ARRIVAL | PROOF | STATUS_CHANGE | NOTE | ON_THE_WAY | OCCURRENCE, or
   * ROUTE_STARTED | ROUTE_COMPLETED | ROUTE_CANCELLED.
   */
  type: string;
  actor: string;

  deliveryId: string | null;
  recipientName: string | null;

  routeId?: string | null;
  routeCode?: number | null;

  driverName: string | null;

  /** The occurrence type, or the status a manual change moved to. */
  detail?: string | null;

  /** A blocking occurrence that applied, or a move to Insucesso. */
  failure?: boolean;

  occurredAt: string;
}

interface TowerPunctuality {
  onTime: number;
  late: number;

  /** The planned hour (plus the grace) passed and it did not leave. */
  notDeparted: number;

  /** Planned for later today. */
  waiting: number;

  notPlanned: number;

  /** Null when nothing is judgeable yet — not 100%. */
  rate: number | null;
}

interface ControlTowerData {
  /** The company's day the numbers are about ("YYYY-MM-DD"). */
  day?: string;
  timeZone?: string;

  positions: TowerPosition[];
  activeRoutes?: TowerActiveRoute[];

  funnel: Array<{ status: string; label: string; total: number }>;
  progress: { finished: number; total: number; rate: number | null };

  punctuality: TowerPunctuality;

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

interface MonitoredStop {
  id: string;
  sequence: number;
  status: "PENDING" | "ARRIVED" | "COMPLETED" | "FAILED" | "CANCELLED";

  deliveryId: string;
  recipientName: string;
  city: string;

  onTheWayAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
}

interface MonitoredRouteProgress {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  cancelled: number;
  arrived: number;
  onTheWay: number;

  /** (delivered + failed) / (total − cancelled), in %. */
  completion: number | null;

  /** delivered / (total − cancelled), in %. */
  deliveredRate: number | null;
}

interface MonitoredRoute {
  id: string;
  code: number;
  name: string | null;
  destination: string | null;
  status: "PLANNED" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

  /** Date-only "YYYY-MM-DD". */
  scheduledDate: string;

  plannedDepartureAt: string | null;
  startedAt: string | null;
  completedAt: string | null;

  driver: { id: string; name: string | null };
  vehiclePlate: string | null;

  progress: MonitoredRouteProgress;
  stops: MonitoredStop[];
}

interface RouteMonitoringData {
  day: string;

  /** The company's zone: every hour on the board is shown in it. */
  timeZone?: string;

  routes: MonitoredRoute[];
  meta: { total: number; page: number; pageSize: number };
}

/**
 * One driver's share of the day's active documents — the tower's funnel,
 * split by driver (decision 7.1).
 */
interface DriverDayRow {
  driverId: string;
  driverName: string;
  cnh: string;

  /** PENDING on the day's routes (or on a route running now). */
  designated: number;
  inRoute: number;
  deliveredToday: number;
  failedToday: number;
}

interface DriverMonitoringData {
  day: string;
  timeZone: string;
  drivers: DriverDayRow[];
}

export type {
  ControlTowerData,
  DriverDayRow,
  DriverMonitoringData,
  DriverTrail,
  MonitoredRoute,
  MonitoredRouteProgress,
  MonitoredStop,
  RouteMonitoringData,
  TowerActiveRoute,
  TowerEvent,
  TowerPosition,
  TowerPunctuality,
  TowerVehicleState,
  TrailPoint,
};
