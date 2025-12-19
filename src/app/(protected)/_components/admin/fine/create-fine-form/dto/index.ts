interface CreateFineValidationError {
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
  businessId?: string[];
  latitude?: string[];
  longitude?: string[];
  createFineErrorMessage?: string;
}

interface CreateFineFormState {
  createFineError?: CreateFineValidationError;
  successMessage?: string;
}

interface CreateFineFormSubmitProps {
  state: CreateFineFormState;
  onBack: () => void;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

export type { CreateFineFormState, CreateFineFormSubmitProps };
