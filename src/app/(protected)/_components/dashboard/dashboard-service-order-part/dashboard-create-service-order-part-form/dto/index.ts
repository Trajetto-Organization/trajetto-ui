import {
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

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

interface DashboardCreateServiceOrderPartContainerProps {
  state: DashboardCreateServiceOrderPartFormState;
  onBack: () => void;
  quantityInputValue: string;
  displayUnitPrice: string;
  displayDiscountPercentage: string;
  handleQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  handleDiscountPercentageChange: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  handleDiscountPercentageBlur: () => void;
  handleQuantityBlur: () => void;
}

interface DashboardSelectServiceOrderPartStepProps {
  state: DashboardCreateServiceOrderPartFormState;
  businessId: string;
  commandServiceOrderInputValue: CommandServiceOrderInputValue;
  commandPartInputValue: CommandPartInputValue;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  onContinue: () => void;
}

export type {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartContainerProps,
  DashboardSelectServiceOrderPartStepProps,
};
