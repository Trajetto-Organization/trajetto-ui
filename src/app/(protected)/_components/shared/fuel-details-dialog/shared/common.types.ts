import { FuelProps } from "../../common.types";

interface VehicleEfficiencyData {
  current_mileage: number;
  km_per_liter: number;
  last_maintenance_mileage?: number;
}

interface FuelDetailsDialogProps {
  fuelData: FuelProps;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export type { FuelDetailsDialogProps, VehicleEfficiencyData };
