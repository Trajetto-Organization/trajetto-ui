interface VehicleActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    license_plate: string;
  } | null;
  onViewFuels: (vehicleId: string) => void;
  onViewServiceOrders: (vehicleId: string) => void;
}

export type { VehicleActionModalProps };
