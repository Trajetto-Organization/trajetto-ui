import { CommandSupplierInputValue } from "@/app/(protected)/_components/dto";

interface DashboardUpdatePartValidationError {
  description?: string[];
  businessId?: string[];
  unit_price?: string[];
  supplierId?: string[];
  updatePartErrorMessage?: string;
}

interface DashboardUpdatePartFormState {
  updatePartError?: DashboardUpdatePartValidationError;
  successMessage?: string;
}

interface DashboardUpdatePartFormSubmitProps {
  state: DashboardUpdatePartFormState;
  handleCloseUpdatePart: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  isDirty: boolean;
  handleUpdateSearchSupplierInputValue: ({
    searchSupplierInputValue,
    supplierId,
  }: CommandSupplierInputValue) => void;
  partValues: {
    description: string;
    displayUnitPrice: string;
    commandSupplierInputValue: CommandSupplierInputValue;
  };
}

export type {
  DashboardUpdatePartFormSubmitProps,
  DashboardUpdatePartFormState,
};
