import type { DashboardFineProps } from "../dashboard-fine.types";

interface DashboardUpdateFineValidationError {
  violation_date?: string[];
  due_date?: string[];
  payment_date?: string[];
  amount?: string[];
  points?: string[];
  location?: string[];
  observation?: string[];
  branchId?: string[];
  driverId?: string[];
  vehicleId?: string[];
  trafficViolationCodeId?: string[];
  latitude?: string[];
  longitude?: string[];
  updateFineErrorMessage?: string;
}

interface DashboardUpdateFineFormState {
  updateFineError?: DashboardUpdateFineValidationError;
  successMessage?: string;
}

interface DashboardUpdateFineFormSubmitProps {
  state: DashboardUpdateFineFormState;
  onBack: () => void;
  isEntityDirty: boolean;
  fineData: DashboardFineProps;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  // 📍 GEOLOCATION PROPS
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
}

interface DashboardUpdateFineFormProps {
  fineData: DashboardFineProps;
  handleCloseUpdateFine: () => void;
  isUpdateFineOpen: boolean;
}

export type {
  DashboardUpdateFineFormState,
  DashboardUpdateFineFormProps,
  DashboardUpdateFineFormSubmitProps,
};
