interface CreateServiceOrderPartValidationError {
  unit_price?: string[];
  quantity?: string[];
  discount_percentage?: string[];
  partId?: string[];
  serviceOrderId?: string[];
  businessId?: string[];
  createServiceOrderPartErrorMessage?: string;
}

interface CreateServiceOrderPartFormState {
  createServiceOrderPartError?: CreateServiceOrderPartValidationError;
  successMessage?: string;
}

interface CreateServiceOrderPartFormSubmitProps {
  state: CreateServiceOrderPartFormState;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  CreateServiceOrderPartFormState,
  CreateServiceOrderPartFormSubmitProps,
};
