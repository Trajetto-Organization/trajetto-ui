import {
  CommandBusinessInputValue,
  CommandVehicleInputValue,
  FuelProps,
} from "@/app/(protected)/_components/dto";

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
  latitude?: string[];
  longitude?: string[];
  updateFuelErrorMessage?: string;
}

interface UpdateFuelFormState {
  updateFuelError?: UpdateFuelValidationError;
  successMessage?: string;
}

interface UpdateFuelFormSubmitProps {
  state: UpdateFuelFormState;
  onBack: () => void;
  fuelData: FuelProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFuelOpen: boolean;
  commandBusinessInputValue: CommandBusinessInputValue;
  commandVehicleInputValue: CommandVehicleInputValue;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
}

interface UpdateFuelFormProps {
  fuelData: FuelProps;
  handleCloseUpdateFuel: () => void;
  isUpdateFuelOpen: boolean;
}

export type {
  UpdateFuelFormState,
  UpdateFuelFormProps,
  UpdateFuelFormSubmitProps,
};
