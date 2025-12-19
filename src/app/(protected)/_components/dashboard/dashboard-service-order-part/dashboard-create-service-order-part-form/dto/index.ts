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

export type {
  DashboardCreateServiceOrderPartFormState,
  DashboardCreateServiceOrderPartFormSubmitProps,
};
