interface DashboardCreateFineValidationError {
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
  createFineErrorMessage?: string;
}

interface DashboardCreateFineFormState {
  createFineError?: DashboardCreateFineValidationError;
  successMessage?: string;
}

interface DashboardCreateFineFormSubmitProps {
  state: DashboardCreateFineFormState;
  onBack: () => void;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
}

export type {
  DashboardCreateFineFormState,
  DashboardCreateFineFormSubmitProps,
};
