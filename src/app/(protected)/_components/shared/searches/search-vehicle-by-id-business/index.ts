import { useQuery } from "react-query";
import { relayUrl } from "@/lib/api-relay-paths";

import type {
  FetchVehicleDataProps,
  UseFetchVehicleDataProps,
  VehicleData,
} from "./search-vehicle-by-id-business.types";

const fetchVehicleData = async ({
  vehicleId,
  businessId,
}: FetchVehicleDataProps): Promise<VehicleData | null> => {
  if (!vehicleId || !businessId) {
    return null;
  }

  const response = await fetch(
    relayUrl(
      `/vehicle/get-vehicle/${encodeURIComponent(vehicleId)}/business/${encodeURIComponent(businessId)}`,
    ),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Erro ao buscar dados do veículo");
  }

  const data = await response.json();

  return {
    current_mileage: data.current_mileage || 0,
    maintenance_interval_km: data.maintenance_interval_km || 0,
    last_maintenance_mileage: data.last_maintenance_mileage || null,
    km_per_liter: data.km_per_liter || 0,
    license_plate: data.license_plate || "",
    description: data.description || "",
    last_fuel_mileage: data.last_fuel_mileage || null,
    last_fuel_date: data.last_fuel_date || null,
  };
};

function useFetchVehicleData({
  vehicleId,
  businessId,
}: UseFetchVehicleDataProps) {
  return useQuery({
    queryKey: ["vehicleData", vehicleId, businessId],
    queryFn: () => fetchVehicleData({ vehicleId, businessId }),
    refetchOnWindowFocus: false,

    // Current mileage and maintenance interval feed the form's validation,
    // and another session's refueling or service order moves them.
    staleTime: 0,
    retry: 2,
    enabled: !!vehicleId && !!businessId,

    // Keyed by vehicle: keeping the previous answer would validate the new
    // vehicle against the old one's mileage until the request lands.
    keepPreviousData: false,
  });
}

export { useFetchVehicleData };
export type { VehicleData };
