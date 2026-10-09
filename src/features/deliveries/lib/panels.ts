import type { DeliveryStatus } from "@/actions/delivery/get-delivery";

/** One row of the cross-delivery occurrence feed, as the API streams it. */
interface OccurrenceRow {
  id: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Short-lived signed URLs, ready for <img>. */
  photos: string[];
  created_at: string;
  /**
   * When the driver reported it, for a report the app sent later. Null for
   * rows written before, and absent from an API older than the field.
   */
  occurred_at?: string | null;
  occurrenceType: {
    id: string;
    name: string;
    blocks_delivery: boolean;
    requires_photo: boolean;
  };
  reportedBy: { id: string; name: string };
  delivery: {
    id: string;
    recipient_name: string;
    status: DeliveryStatus;
    city: string;
    uf: string;
    code: string | null;
  };
  /**
   * Decision 14.3: DELIVERED is a proof recorded as an occurrence, not a
   * problem. Absent from an API older than it (reads as NOT_DELIVERED).
   */
  category?: "DELIVERED" | "NOT_DELIVERED";
  /**
   * DELIVERED rows: the receipt photo and the on-screen signature as
   * short-lived signed URLs, and who received. Null on a problem row; absent
   * from an API older than them.
   */
  receipt_photo?: string | null;
  signature?: string | null;
  received_by?: string | null;
  /** The tower's say (decision 6.3); absent from an API older than it. */
  authorization_status?:
    "NOT_REQUIRED" | "PENDING" | "APPROVED" | "DENIED" | "SUPERSEDED";
  authorization_note?: string | null;
}

interface DriverOperationRow {
  driverId: string;
  driverName: string;
  cnh: string;
  designated: number;
  inRoute: number;
  deliveredToday: number;
  failedToday: number;
}

interface OperationSummaryData {
  totals: {
    unassigned: number;
    designated: number;
    inRoute: number;
    deliveredToday: number;
    failedToday: number;
    occurrencesToday: number;
  };
  drivers: DriverOperationRow[];
}

/**
 * The moment an occurrence happened: the driver's report, not its arrival.
 * A report queued in a dead zone at 10:05 and sent at 13:40 is a 10:05
 * occurrence (MOB-08).
 */
function occurrenceMoment(
  row: Pick<OccurrenceRow, "created_at" | "occurred_at">,
): string {
  return row.occurred_at ?? row.created_at;
}

export { occurrenceMoment };
export type { DriverOperationRow, OccurrenceRow, OperationSummaryData };
