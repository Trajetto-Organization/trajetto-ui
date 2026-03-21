import type { CommandVehicleInputValue } from "@/app/(protected)/_components/shared/common.types";

interface DashboardCreateFuelValidationError {
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

interface DashboardCreateFuelFormState {
  createFuelError?: DashboardCreateFuelValidationError;
  successMessage?: string;
}

interface DashboardCreateFuelFormSubmitProps {
  onBack: () => void;
  state: DashboardCreateFuelFormState;
  commandVehicleInputValue: CommandVehicleInputValue;
  businessId: string;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  odometerFile: File | null;
  setOdometerFile: (file: File | null) => void;
  fileError: string | null;
  setFileError: (error: string | null) => void;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

export type {
  DashboardCreateFuelFormState,
  DashboardCreateFuelFormSubmitProps,
};
