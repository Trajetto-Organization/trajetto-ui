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
  const { data: previousFuelData, isLoading: isLoadingPreviousFuel } =
    useFetchPreviousFuel({
      vehicleId: fuelData.vehicleId,
      currentFuelDate: fuelData.refueling_date,
      businessId: fuelData.businessId || "",
      enabled: isOpen,
    });

  // Conversions for calculations
  const liters = parseFloat(fuelData.liters_amount.replace(",", ".")) || 0;
  const pricePerLiter =
    parseFloat(
      fuelData.price_per_liter.replace(/[^\d,]/g, "").replace(",", "."),
    ) || 0;

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
