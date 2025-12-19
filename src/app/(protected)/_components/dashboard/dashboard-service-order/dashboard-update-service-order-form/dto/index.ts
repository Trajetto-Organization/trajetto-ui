import { DashboardServiceOrderProps } from "../../dto";

interface DashboardUpdateServiceOrderValidationError {
  date?: string[];
  completion_date?: string[];
  maintenance_type?: string[];
  total_amount?: string[];
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

interface DashboardUpdateServiceOrderFormState {
  updateServiceOrderError?: DashboardUpdateServiceOrderValidationError;
  successMessage?: string;
}

interface DashboardUpdateServiceOrderFormSubmitProps {
  state: DashboardUpdateServiceOrderFormState;
  onBack: () => void;
  serviceOrderData: DashboardServiceOrderProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderOpen: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

interface DashboardUpdateServiceOrderFormProps {
  serviceOrderData: DashboardServiceOrderProps;
  handleCloseUpdateServiceOrder: () => void;
  isUpdateServiceOrderOpen: boolean;
}

export type {
  DashboardUpdateServiceOrderFormState,
  DashboardUpdateServiceOrderFormProps,
  DashboardUpdateServiceOrderFormSubmitProps,
};
