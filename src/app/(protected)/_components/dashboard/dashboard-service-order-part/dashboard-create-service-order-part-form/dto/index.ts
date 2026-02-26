interface DashboardCreateServiceOrderPartValidationError {
  unit_price?: string[];
  quantity?: string[];
  discount_percentage?: string[];
  partId?: string[];
  serviceOrderId?: string[];
  businessId?: string[];
  createServiceOrderPartErrorMessage?: string;
}

interface DashboardCreateServiceOrderPartFormState {
  createServiceOrderPartError?: DashboardCreateServiceOrderPartValidationError;
  successMessage?: string;
}

interface DashboardCreateServiceOrderPartFormSubmitProps {
  state: DashboardCreateServiceOrderPartFormState;
  onBack: () => void;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

export type {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartFormSubmitProps,
};
