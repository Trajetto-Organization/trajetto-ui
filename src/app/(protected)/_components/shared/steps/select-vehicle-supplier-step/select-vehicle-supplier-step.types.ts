import {
  CommandSupplierInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface SelectVehicleSupplierStepProps {
  businessId: string;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandSupplierInputValue: CommandSupplierInputValue;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
  handleUpdateSearchSupplierInputValue: (
    supplierData: CommandSupplierInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorVehicleId?: string[];
  errorSupplierId?: string[];
  searchSupplierIsOptional?: boolean;
  searchVehicleIsOptional?: boolean;
}

export type { SelectVehicleSupplierStepProps };
