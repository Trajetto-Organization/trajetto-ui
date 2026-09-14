import type { CommandVehicleInputValue } from "@/app/(protected)/_components/shared/common.types";
import type { ServiceOrderProps } from "../service-order.types";

interface UpdateServiceOrderValidationError {
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
  updateServiceOrderErrorMessage?: string;
}

interface UpdateServiceOrderFormState {
  updateServiceOrderError?: UpdateServiceOrderValidationError;
  successMessage?: string;
}

interface UpdateServiceOrderFormSubmitProps {
  state: UpdateServiceOrderFormState;
  onBack: () => void;
  serviceOrderData: ServiceOrderProps;
  isEntityDirty: boolean;
  commandVehicleInputValue: CommandVehicleInputValue;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface UpdateServiceOrderFormProps {
  serviceOrderData: ServiceOrderProps;
  handleCloseUpdateServiceOrder: () => void;
  isUpdateServiceOrderOpen: boolean;
}

export type {
  UpdateServiceOrderFormState,
  UpdateServiceOrderFormProps,
  UpdateServiceOrderFormSubmitProps,
};
