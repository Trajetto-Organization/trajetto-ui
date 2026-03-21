import type {
  CommandBusinessInputValue,
  CommandSupplierInputValue,
} from "@/app/(protected)/_components/shared/common.types";

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

interface CreatePartFormSubmitProps {
  state: CreatePartFormState;
  handleOpenCreatePartForm: () => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  handleUpdateSearchBusinessInputValue: ({
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

export type { CreatePartFormSubmitProps, CreatePartFormState };
