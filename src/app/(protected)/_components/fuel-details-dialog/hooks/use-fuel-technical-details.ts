import { useFetchPreviousFuel } from "../../search-previous-fuel-by-vehicle";
import { useFetchVehicleData } from "../../search-vehicle-by-id-business";

import { FuelProps } from "../../dto";

function useFuelTechnicalDetails(fuelData: FuelProps, isOpen: boolean) {
  // Fetch vehicle data for efficiency calculations
  const { data: vehicleData, isLoading } = useFetchVehicleData({
    vehicleId: fuelData.vehicleId,
    businessId: fuelData.businessId || "",
  });

  // Fetch previous fuel record for this specific fuel
  // Convert Date to string if needed
  const currentFuelDate =
    fuelData.refueling_date instanceof Date
      ? fuelData.refueling_date.toISOString()
      : fuelData.refueling_date;

  const { data: previousFuelData, isLoading: isLoadingPreviousFuel } =
    useFetchPreviousFuel({
      vehicleId: fuelData.vehicleId,
      currentFuelDate,
      businessId: fuelData.businessId || "",
      enabled: isOpen,
    });

  // RAW data comes as numbers, no need to parse
  const liters = fuelData.liters_amount || 0;
  const pricePerLiter = fuelData.price_per_liter || 0;

  return {
    vehicleData,
    isLoading,
    isLoadingPreviousFuel,
    previousFuelData,
    liters,
    pricePerLiter,
  };
}

export { useFuelTechnicalDetails };
