import type { ServiceOrderPartProps } from "../service-order-part.types";

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

interface UpdateServiceOrderPartFormSubmitProps {
  state: UpdateServiceOrderPartFormState;
  onBack: () => void;
  serviceOrderPartData: ServiceOrderPartProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderPartOpen: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface UpdateServiceOrderPartFormProps {
  serviceOrderPartData: ServiceOrderPartProps;
  handleCloseUpdateServiceOrderPart: () => void;
  isUpdateServiceOrderPartOpen: boolean;
}

export type {
  UpdateServiceOrderPartFormState,
  UpdateServiceOrderPartFormProps,
  UpdateServiceOrderPartFormSubmitProps,
};
