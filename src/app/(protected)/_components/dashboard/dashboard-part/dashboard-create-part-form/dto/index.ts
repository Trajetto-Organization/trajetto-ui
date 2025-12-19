import { CommandSupplierInputValue } from "../../../../dto";

interface DashboardCreatePartValidationError {
  description?: string[];
  businessId?: string[];
  unit_price?: string[];
  supplierId?: string[];
  createPartErrorMessage?: string;
}

interface DashboardCreatePartFormState {
  createPartError?: DashboardCreatePartValidationError;
  successMessage?: string;
}

interface DashboardCreatePartSubmitProps {
  state: DashboardCreatePartFormState;
  handleOpenCreatePartForm: () => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  handleUpdateSearchSupplierInputValue: ({
    searchSupplierInputValue,
    supplierId,
  }: CommandSupplierInputValue) => void;
  commandSupplierInputValue: CommandSupplierInputValue;
  displayUnitPrice: string;
}

export type { DashboardCreatePartSubmitProps, DashboardCreatePartFormState };
