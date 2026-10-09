import type { DriverVehicleOption } from "./options";

interface VehicleActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_plate: string;
  } | null;
  /** Only what this driver may open; see `driverVehicleOptions`. */
  options: DriverVehicleOption[];
  onSelect: (href: string) => void;
}

export type { VehicleActionModalProps };
