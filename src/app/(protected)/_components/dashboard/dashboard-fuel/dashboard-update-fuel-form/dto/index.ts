import {
  CommandVehicleInputValue,
  FuelProps,
} from "@/app/(protected)/_components/dto";

interface DashboardUpdateFuelValidationError {
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

interface DashboardUpdateFuelFormState {
  updateFuelError?: DashboardUpdateFuelValidationError;
  successMessage?: string;
}

interface DashboardUpdateFuelFormSubmitProps {
  state: DashboardUpdateFuelFormState;
  onBack: () => void;
  fuelData: FuelProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFuelOpen: boolean;
  commandVehicleInputValue: CommandVehicleInputValue;
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

interface DashboardUpdateFuelFormProps {
  fuelData: FuelProps;
  handleCloseUpdateFuel: () => void;
  isUpdateFuelOpen: boolean;
}

export type {
  DashboardUpdateFuelFormState,
  DashboardUpdateFuelFormProps,
  DashboardUpdateFuelFormSubmitProps,
};
