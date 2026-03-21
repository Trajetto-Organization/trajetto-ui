interface FuelInfoAlertProps {
  liters?: number;
  pricePerLiter?: number;
  currentMileage?: number;
  vehicleKmPerLiter?: number;
  lastFuelMileage?: number | null;
  className?: string;
}

export type { FuelInfoAlertProps };
