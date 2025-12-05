interface FetchServiceOrderByVehicleProps {
  pageParam: number;
  vehicleId: string;
  businessId: string;
  signal?: AbortSignal;
}

export type { FetchServiceOrderByVehicleProps };
