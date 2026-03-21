interface FetchServiceOrderByVehicleProps {
  cursor?: string;
  vehicleId: string;
  signal?: AbortSignal;
}

interface FetchServiceOrderByVehicleResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type {
  FetchServiceOrderByVehicleProps,
  FetchServiceOrderByVehicleResult,
};
