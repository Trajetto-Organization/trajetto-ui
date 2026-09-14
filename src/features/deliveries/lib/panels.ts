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

export type { DriverOperationRow, OccurrenceRow, OperationSummaryData };
