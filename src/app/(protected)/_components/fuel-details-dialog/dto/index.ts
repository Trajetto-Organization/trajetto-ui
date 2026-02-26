import { FuelProps } from "../../dto";

interface FuelDetailsDialogProps {
  fuelData: FuelProps;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VehicleEfficiencyData {
  current_mileage: number;
  km_per_liter: number;
  last_maintenance_mileage?: number;
}

type InfoItem = {
  icon: React.ElementType;
  label: string;
  content: React.ReactNode;
};

export type { FuelDetailsDialogProps, VehicleEfficiencyData, InfoItem };
