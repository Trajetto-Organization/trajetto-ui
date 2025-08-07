import {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

import { DashboardServiceOrderPartProps } from "../../dto";

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

interface DashboardUpdateServiceOrderPartContainerProps {
  state: DashboardUpdateServiceOrderPartFormState;
  onBack: () => void;
  serviceOrderPartData: DashboardServiceOrderPartProps;
  isBusinessAndEntityDirty: boolean;
  isUpdateServiceOrderPartOpen: boolean;
}

interface DashboardSelectServiceOrderPartStepProps {
  state: DashboardUpdateServiceOrderPartFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  commandPartInputValue: CommandPartInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  onContinue: () => void;
}

interface DashboardUpdateServiceOrderPartFormProps {
  serviceOrderPartData: DashboardServiceOrderPartProps;
  handleCloseUpdateServiceOrderPart: () => void;
  isUpdateServiceOrderPartOpen: boolean;
}

export type {
  DashboardUpdateServiceOrderPartFormState,
  DashboardUpdateServiceOrderPartFormProps,
  DashboardUpdateServiceOrderPartContainerProps,
  DashboardSelectServiceOrderPartStepProps,
};
