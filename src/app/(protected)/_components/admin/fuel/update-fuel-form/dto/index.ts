import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
  CommandDriverInputValue,
  CommandVehicleInputValue,
  CommandFuelTypeInputValue,
} from "@/app/(protected)/_components/dto";

import { FuelProps } from "../../dto";

interface UpdateFuelValidationError {
  current_mileage?: string[];
  liters_amount?: string[];
  price_per_liter?: string[];
  notes?: string[];
  refueling_date?: string[];
  vehicleId?: string[];
  driverId?: string[];
  fuelTypeId?: string[];
  branchId?: string[];
  businessId?: string[];
  odometer_photo?: string[];
  updateFuelErrorMessage?: string;
}

interface UpdateFuelFormState {
  updateFuelError?: UpdateFuelValidationError;
  successMessage?: string;
}

interface UpdateFuelContainerProps {
  state: UpdateFuelFormState;
  onBack: () => void;
  fuelData: FuelProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFuelOpen: boolean;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandVehicleInputValue: CommandVehicleInputValue;
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
}

interface SelectBusinessBranchStepProps {
  state: UpdateFuelFormState;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
}

interface SelectVehicleDriverStepProps {
  state: UpdateFuelFormState;
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
}

interface SelectFuelTypeStepProps {
  state: UpdateFuelFormState;
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface UpdateFuelFormProps {
  fuelData: FuelProps;
  handleCloseUpdateFuel: () => void;
  isUpdateFuelOpen: boolean;
}

export type {
  UpdateFuelFormState,
  UpdateFuelFormProps,
  UpdateFuelContainerProps,
  SelectBusinessBranchStepProps,
  SelectVehicleDriverStepProps,
  SelectFuelTypeStepProps,
};
