/**
 * The pause report as the API answers it (GET /driver-pause/report/:businessId,
 * trajetto-api src/modules/driver-pause). One row per driver and workday.
 */

type PauseKind = "MEAL" | "REST" | "OTHER";

const PAUSE_FLAG_CODES = [
  "MEAL_MISSING",
  "MEAL_SHORT",
  "DRIVING_REST_SHORT",
  "INTERJORNADA_SHORT",
  "PAUSE_NOT_ENDED",
  "PAUSE_TOO_LONG",
] as const;

type PauseFlagCode = (typeof PAUSE_FLAG_CODES)[number];

interface ReportPauseEntry {
  id: string;
  /** The legal nature the Lei 13.103 alerts read. */
  kind: PauseKind;
  /**
   * The company's pause type the driver chose (decision 14.4: "Lanche",
   * "Almoço"...); absent from an API before the pause types.
   */
  occurrence_type_name?: string | null;
  /**
   * ENDED; ONGOING (open for less than 12 h); NOT_ENDED (open for more than
   * 12 h) and TOO_LONG (closed only after 12 h): forgotten, out of the sums.
   */
  status: "ENDED" | "ONGOING" | "NOT_ENDED" | "TOO_LONG";
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  note: string | null;
  routeId: string | null;
}

interface DriverDayRow {
  id: string;
  day: string;
  driverId: string;
  driverName: string;
  inProgress: boolean;
  workday: { start: string; end: string; minutes: number };
  pauses: ReportPauseEntry[];
  totals: {
    pauseMinutes: number;
    mealMinutes: number;
    longestMealMinutes: number;
    restMinutes: number;
    otherMinutes: number;
    drivingMinutes: number;
    longestDrivingWithoutRestMinutes: number;
  };
  previousWorkdayEnd: string | null;
  restBeforeMinutes: number | null;
  flags: Array<{ code: PauseFlagCode; message: string }>;
}

interface FacetCount {
  value: string;
  label?: string;
  count: number;
}

interface PauseReportSearchMeta {
  days: number;
  drivers: number;
  pauses: number;
  daysWithAlerts: number;
  facets: {
    driverId: FacetCount[];
    flag: FacetCount[];
  };
}

interface PauseReport {
  timeZone: string;
  from: string;
  to: string;
  rules: {
    mealMinMinutes: number;
    mealRequiredAboveWorkdayMinutes: number;
    drivingBlockMinutes: number;
    drivingRestMinutes: number;
    interjornadaMinutes: number;
    forgottenPauseMinutes: number;
  };
  total: number;
  page: number;
  pageSize: number;
  searchMeta: PauseReportSearchMeta;
  data: DriverDayRow[];
}

export { PAUSE_FLAG_CODES };
export type {
  DriverDayRow,
  PauseFlagCode,
  PauseKind,
  PauseReport,
  PauseReportSearchMeta,
  ReportPauseEntry,
};
