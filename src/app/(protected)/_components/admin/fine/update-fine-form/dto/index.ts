import { CommandBusinessInputValue } from "@/app/(protected)/_components/dto";
import { FineProps } from "../../dto";

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
  fineData: FineProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateFineOpen: boolean;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleLocationChange: (lat: number, lon: number) => void;
  handleLocationLoadingChange: (isLoading: boolean) => void;
  latitude: number | null;
  longitude: number | null;
  isLoadingLocation: boolean;
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
