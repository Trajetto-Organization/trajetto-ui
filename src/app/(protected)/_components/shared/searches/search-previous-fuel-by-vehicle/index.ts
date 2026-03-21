import { useQuery } from "react-query";
import { getCookies } from "@/actions/cookies";

import type {
  FetchPreviousFuelProps,
  PreviousFuelData,
} from "./search-previous-fuel-by-vehicle.types";

const fetchPreviousFuel = async ({
  vehicleId,
  currentFuelDate,
  businessId,
}: FetchPreviousFuelProps): Promise<PreviousFuelData | null> => {
  if (!vehicleId || !currentFuelDate || !businessId) {
    return null;
  }

  const tokenAccess = await getCookies("tkey");
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_HTTP_REQUEST}/fuel/get-previous-fuel/${vehicleId}?date=${currentFuelDate}&businessId=${businessId}`,
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
    return null;
  }

  const data = await response.json();

  if (!data) {
    return null;
  }

  return {
    current_mileage: data.current_mileage || 0,
    refueling_date: data.refueling_date || "",
  };
};

interface UseFetchPreviousFuelProps {
  vehicleId: string;
  currentFuelDate: string;
  businessId: string;
  enabled?: boolean;
}

function useFetchPreviousFuel({
  vehicleId,
  currentFuelDate,
  businessId,
  enabled = true,
}: UseFetchPreviousFuelProps) {
  return useQuery({
    queryKey: ["previousFuel", vehicleId, currentFuelDate, businessId],
    queryFn: () =>
      fetchPreviousFuel({ vehicleId, currentFuelDate, businessId }),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    enabled: enabled && !!vehicleId && !!currentFuelDate && !!businessId,
  });
}

export { useFetchPreviousFuel };
export type { PreviousFuelData };
