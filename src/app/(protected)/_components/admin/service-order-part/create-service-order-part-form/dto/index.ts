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
  CreateServiceOrderPartFormState,
  CreateServiceOrderPartFormSubmitProps,
};
