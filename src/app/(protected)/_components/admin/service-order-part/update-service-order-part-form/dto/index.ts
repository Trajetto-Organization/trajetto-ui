import {
  CommandBusinessInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

import { ServiceOrderPartProps } from "../../dto";

interface UpdateServiceOrderPartValidationError {
  unit_price?: string[];
  quantity?: string[];
  discount_percentage?: string[];
  partId?: string[];
  serviceOrderId?: string[];
  businessId?: string[];
  updateServiceOrderPartErrorMessage?: string;
}

interface UpdateServiceOrderPartFormState {
  updateServiceOrderPartError?: UpdateServiceOrderPartValidationError;
  successMessage?: string;
}

interface UpdateServiceOrderPartContainerProps {
  state: UpdateServiceOrderPartFormState;
  onBack: () => void;
  serviceOrderPartData: ServiceOrderPartProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderPartOpen: boolean;
}

interface SelectBusinessStepProps {
  state: UpdateServiceOrderPartFormState;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
}

interface SelectServiceOrderPartStepProps {
  state: UpdateServiceOrderPartFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  commandPartInputValue: CommandPartInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface UpdateServiceOrderPartFormProps {
  serviceOrderPartData: ServiceOrderPartProps;
  handleCloseUpdateServiceOrderPart: () => void;
  isUpdateServiceOrderPartOpen: boolean;
}

export type {
  UpdateServiceOrderPartFormState,
  UpdateServiceOrderPartFormProps,
  UpdateServiceOrderPartContainerProps,
  SelectBusinessStepProps,
  SelectServiceOrderPartStepProps,
};
