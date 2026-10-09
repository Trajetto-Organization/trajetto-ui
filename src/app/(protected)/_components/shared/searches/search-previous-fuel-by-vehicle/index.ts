import { useQuery } from "react-query";
import { relayUrl } from "@/lib/api-relay-paths";

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

  // Encoded: an ISO date with an offset ("+") would otherwise reach the API
  // as a space. `businessId` is the record's company — on /admin, the one
  // the MASTER selected (the API used to refuse him here).
  const query = new URLSearchParams({ date: currentFuelDate, businessId });

  const response = await fetch(
    relayUrl(`/fuel/get-previous-fuel/${encodeURIComponent(vehicleId)}`, query),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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

    // Asked again whenever a form opens: the mileage it validates against
    // moves with every refueling, including ones recorded in another session.
    staleTime: 0,
    retry: 1,
    enabled: enabled && !!vehicleId && !!currentFuelDate && !!businessId,

    // Same reason as useFetchVehicleData: another vehicle's last refueling
    // must not stand in for this one's while it loads.
    keepPreviousData: false,
  });
}

export { useFetchPreviousFuel };
export type { PreviousFuelData };
