import {
  CommandBusinessInputValue,
  CommandPartInputValue,
  CommandServiceOrderInputValue,
} from "@/app/(protected)/_components/dto";

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

interface CreateServiceOrderPartContainerProps {
  state: CreateServiceOrderPartFormState;
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

interface SelectBusinessStepProps {
  state: CreateServiceOrderPartFormState;
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
}

interface SelectServiceOrderPartStepProps {
  state: CreateServiceOrderPartFormState;
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

export type {
  CreateServiceOrderPartFormState,
  CreateServiceOrderPartContainerProps,
  SelectBusinessStepProps,
  SelectServiceOrderPartStepProps,
};
