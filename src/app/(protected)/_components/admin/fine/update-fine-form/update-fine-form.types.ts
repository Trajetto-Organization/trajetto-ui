import type { FineProps } from "../fine.types";

interface UpdateFineValidationError {
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
  businessId?: string[];
  trafficViolationCodeId?: string[];
  latitude?: string[];
  longitude?: string[];
  updateFineErrorMessage?: string;
}

interface UpdateFineFormState {
  updateFineError?: UpdateFineValidationError;
  successMessage?: string;
}

interface UpdateFineFormSubmitProps {
  state: UpdateFineFormState;
  onBack: () => void;
  isEntityDirty: boolean;
  fineData: FineProps;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
  // 📍 GEOLOCATION PROPS
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
}

interface UpdateFineFormProps {
  fineData: FineProps;
  handleCloseUpdateFine: () => void;
  isUpdateFineOpen: boolean;
}

export type {
  UpdateFineFormState,
  UpdateFineFormProps,
  UpdateFineFormSubmitProps,
};
