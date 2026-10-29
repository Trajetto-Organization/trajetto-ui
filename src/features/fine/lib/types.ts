/**
 * A fine as GET /fines/list-fine streams it (trajetto-api
 * routes/documentation/fine-documentation.ts `fineRow`). One type for both
 * screens: the /admin and the /dashboard copies each declared their own, and
 * the admin one expected a `business` object the API no longer sends (the
 * list is always one company now).
 */

type FineStatus = "PAID" | "PENDING" | "OVERDUE";

interface FineRow {
  id: string;
  /** Decided by the API on the company's business day. */
  status: FineStatus;
  violation_date: string;
  due_date: string;
  payment_date: string | null;
  /**
   * The same dates as days ("YYYY-MM-DD") in the company's zone, decided by
   * the API: what the table shows and the form edits. The instants above,
   * read in the viewer's zone, named another day for a company elsewhere.
   */
  violation_day: string;
  due_day: string;
  payment_day: string | null;
  amount: number;
  points: number;
  location: string | null;
  observation: string | null;
  businessId: string;
  branchId: string;
  driverId: string;
  vehicleId: string;
  trafficViolationCodeId: string;
  latitude: number | null;
  longitude: number | null;
  location_source: string | null;
  created_from: string;
  created_at: string;
  updated_at: string;
  branch: { corporate_reason: string };
  driver: { name: string; cpf: string };
  vehicle: { license_plate: string; description: string };
  trafficViolationCode: {
    code: string;
    sub_code: number;
    description: string;
    gravity: string;
    points: number;
  };
}

interface FacetCount {
  value: string;
  label?: string;
  count: number;
}

/** The NDJSON meta line's `searchMeta`: the cards and the filter options. */
interface FineListSearchMeta {
  total?: number;
  paid?: number;
  pending?: number;
  overdue?: number;
  totalAmount?: number;
  openAmount?: number;
  facets?: {
    status?: FacetCount[];
    branchId?: FacetCount[];
    trafficViolationCodeId?: FacetCount[];
  };
}

/** Which company a fines screen works on, and how it got it. */
type FineScreenMode = "admin" | "dashboard";

export type { FineListSearchMeta, FineRow, FineScreenMode, FineStatus };
