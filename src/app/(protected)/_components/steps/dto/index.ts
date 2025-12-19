import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandFuelTypeInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
  CommandSupplierInputValue,
  CommandTrafficViolationCodeInputValue,
  CommandUserInputValue,
  CommandVehicleInputValue,
  CommandVehicleTypeInputValue,
} from "@/app/(protected)/_components/dto";

interface SelectBusinessStepProps {
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
}

interface SelectBusinessBranchStepProps {
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
  errorBranchId?: string[];
  searchBranchIsOptional?: boolean;
}

interface SelectBranchStepProps {
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
  businessId: string;
  errorBranchId?: string[];
  searchBranchIsOptional?: boolean;
}

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

interface SelectServiceOrderStepProps {
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorServiceOrderId?: string[];
  searchServiceOrderIsOptional?: boolean;
}

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

interface SelectServiceOrderPartStepProps {
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  commandPartInputValue: CommandPartInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  onContinue: () => void;
  onBack?: () => void;
  errorServiceOrderId?: string[];
  errorPartId?: string[];
  searchServiceOrderIsOptional?: boolean;
  searchPartIsOptional?: boolean;
}

interface SelectViolationCodeStepProps {
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeIsOptional?: boolean;
}

interface SelectUserStepProps {
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
  errorUserId?: string[];
  searchUserIsOptional?: boolean;
}

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

interface SelectFuelTypeStepProps {
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorFuelTypeId?: string[];
  searchFuelTypeIsOptional?: boolean;
}

export type {
  SelectBusinessStepProps,
  SelectBusinessBranchStepProps,
  SelectVehicleSupplierStepProps,
  SelectVehicleDriverStepProps,
  SelectServiceOrderStepProps,
  SelectServiceOrderPartStepProps,
  SelectViolationCodeStepProps,
  SelectUserStepProps,
  SelectDriverVehicleTypeStepProps,
  SelectFuelTypeStepProps,
  SelectBranchStepProps,
};
