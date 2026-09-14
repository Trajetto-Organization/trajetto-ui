import type {
  CommandBusinessInputValue,
  CommandVehicleInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface CreateServiceOrderValidationError {
  date?: string[];
  completion_date?: string[];
  maintenance_type?: string[];
  total_amount?: string[];
  description?: string[];
  current_mileage_at_service?: string[];
  maintenance_interval_km_at_service?: string[];
  last_maintenance_mileage_at_service?: string[];
  new_mileage_after_service?: string[];
  vehicleId?: string[];
  responsibleUserId?: string[];
  branchId?: string[];
  supplierId?: string[];
  businessId?: string[];
  latitude?: string[];
  longitude?: string[];
  createServiceOrderErrorMessage?: string;
}

interface CreateServiceOrderFormState {
  createServiceOrderError?: CreateServiceOrderValidationError;
  successMessage?: string;
}

interface CreateServiceOrderFormSubmitProps {
  state: CreateServiceOrderFormState;
  onBack: () => void;
  commandVehicleInputValue: CommandVehicleInputValue;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type { CreateServiceOrderFormState, CreateServiceOrderFormSubmitProps };
