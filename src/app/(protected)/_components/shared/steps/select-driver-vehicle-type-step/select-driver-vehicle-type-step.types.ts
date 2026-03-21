import {
  CommandDriverInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface SelectDriverVehicleTypeStepProps {
  businessId: string;
  commandDriverInputValue: CommandDriverInputValue;
  commandVehicleTypeInputValue: CommandVehicleTypeInputValue;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  handleUpdateSearchVehicleTypeInputValue: (
    vehicleTypeData: CommandVehicleTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorDriverId?: string[];
  errorVehicleTypeId?: string[];
  searchDriverIsOptional?: boolean;
  searchVehicleTypeIsOptional?: boolean;
}

export type { SelectDriverVehicleTypeStepProps };
