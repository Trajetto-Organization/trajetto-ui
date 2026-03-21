import type {
  CommandBusinessInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface CreateFuelValidationError {
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
  createFuelErrorMessage?: string;
}

interface CreateFuelFormState {
  createFuelError?: CreateFuelValidationError;
  successMessage?: string;
}

interface CreateFuelFormSubmitProps {
  state: CreateFuelFormState;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
}

export type { CreateFuelFormState, CreateFuelFormSubmitProps };
