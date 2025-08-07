import {
  CommandBusinessInputValue,
  CommandSupplierInputValue,
} from "../../../../dto";

interface CreatePartValidationError {
  description?: string[];
  businessId?: string[];
  unit_price?: string[];
  supplierId?: string[];
  createPartErrorMessage?: string;
}

interface CreatePartFormState {
  createPartError?: CreatePartValidationError;
  successMessage?: string;
}

interface CreatePartContainerProps {
  state: CreatePartFormState;
  handleOpenCreatePartForm: () => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  handleUpdateSearchBussinessInputValue: ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchSupplierInputValue: ({
    searchSupplierInputValue,
    supplierId,
  }: CommandSupplierInputValue) => void;
  commandBusinnessInputValue: CommandBusinessInputValue;
  commandSupplierInputValue: CommandSupplierInputValue;
  displayUnitPrice: string;
}

export type { CreatePartContainerProps, CreatePartFormState };
