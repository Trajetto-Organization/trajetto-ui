interface PreviousFuelData {
  current_mileage: number;
  refueling_date: string;
}

interface FetchPreviousFuelProps {
  vehicleId: string;
  currentFuelDate: string;
  businessId: string;
}

export type { PreviousFuelData, FetchPreviousFuelProps };
