interface FetchFuelProps {
  cursor?: string;
  vehicleId?: string;
  signal?: AbortSignal;
}

interface FetchFuelResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { FetchFuelProps, FetchFuelResult };
