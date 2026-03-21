import {
  CommandDriverInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface SelectVehicleDriverStepProps {
  businessId: string;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandDriverInputValue: CommandDriverInputValue;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorVehicleId?: string[];
  errorDriverId?: string[];
  searchVehicleIsOptional?: boolean;
  searchDriverIsOptional?: boolean;
}

export type { SelectVehicleDriverStepProps };
