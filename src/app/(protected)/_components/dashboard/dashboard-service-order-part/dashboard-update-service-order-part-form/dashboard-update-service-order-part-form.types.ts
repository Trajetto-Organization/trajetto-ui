import type { DashboardServiceOrderPartProps } from "../dashboard-service-order-part.types";

interface DashboardUpdateServiceOrderPartValidationError {
  unit_price?: string[];
  quantity?: string[];
  discount_percentage?: string[];
  partId?: string[];
  serviceOrderId?: string[];
  businessId?: string[];
  updateServiceOrderPartErrorMessage?: string;
}

interface DashboardUpdateServiceOrderPartFormState {
  updateServiceOrderPartError?: DashboardUpdateServiceOrderPartValidationError;
  successMessage?: string;
}

interface DashboardUpdateServiceOrderPartFormSubmitProps {
  state: DashboardUpdateServiceOrderPartFormState;
  onBack: () => void;
  serviceOrderPartData: DashboardServiceOrderPartProps;
  isEntityDirty: boolean;
  isUpdateServiceOrderPartOpen: boolean;
  initialFormValues: Record<string, string>;
  onFormValuesChange: (values: Record<string, string>) => void;
}

interface DashboardUpdateServiceOrderPartFormProps {
  serviceOrderPartData: DashboardServiceOrderPartProps;
  handleCloseUpdateServiceOrderPart: () => void;
  isUpdateServiceOrderPartOpen: boolean;
}

export type {
  DashboardUpdateServiceOrderPartFormState,
  DashboardUpdateServiceOrderPartFormProps,
  DashboardUpdateServiceOrderPartFormSubmitProps,
};
