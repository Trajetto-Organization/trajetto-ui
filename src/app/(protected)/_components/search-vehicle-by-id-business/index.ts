import { useQuery } from "react-query";
import { getCookies } from "@/actions/cookies";

interface VehicleData {
  current_mileage: number;
  maintenance_interval_km: number;
  last_maintenance_mileage?: number | null;
}

interface FetchVehicleDataProps {
  vehicleId: string;
  businessId: string;
}

const fetchVehicleData = async ({
  vehicleId,
  businessId,
}: FetchVehicleDataProps): Promise<VehicleData | null> => {
  if (!vehicleId || !businessId) {
    return null;
  }

  const tokenAccess = await getCookies("tkey");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/vehicle/get-vehicle/${vehicleId}/business/${businessId}`,
    {
      credentials: "include",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAccess}`,
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
  };
};

interface UseFetchVehicleDataProps {
  vehicleId: string;
  businessId: string;
}

function useFetchVehicleData({
  vehicleId,
  businessId,
}: UseFetchVehicleDataProps) {
  return useQuery({
    queryKey: ["vehicleData", vehicleId, businessId],
    queryFn: () => fetchVehicleData({ vehicleId, businessId }),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: !!vehicleId && !!businessId,
    keepPreviousData: true,
  });
}

export { useFetchVehicleData };
export type { VehicleData };
