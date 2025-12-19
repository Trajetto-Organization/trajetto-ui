import {
  CommandBusinessInputValue,
  CommandSupplierInputValue,
} from "@/app/(protected)/_components/dto";

interface UpdatePartValidationError {
  description?: string[];
  businessId?: string[];
  unit_price?: string[];
  supplierId?: string[];
  updatePartErrorMessage?: string;
}

interface UpdatePartFormState {
  updatePartError?: UpdatePartValidationError;
  successMessage?: string;
}

interface UpdatePartFormSubmitProps {
  state: UpdatePartFormState;
  handleCloseUpdatePart: () => void;
  handleUpdateDescription: (updatedDescription: string) => void;
  handleUnitPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleUnitPriceBlur: () => void;
  isDirty: boolean;
  handleUpdateSearchBusinessInputValue: ({
    searchBusinessInputValue,
    businessId,
  }: CommandBusinessInputValue) => void;
  handleUpdateSearchSupplierInputValue: ({
    searchSupplierInputValue,
    supplierId,
  }: CommandSupplierInputValue) => void;
  partValues: {
    description: string;
    displayUnitPrice: string;
    commandBusinessInputValue: CommandBusinessInputValue;
    commandSupplierInputValue: CommandSupplierInputValue;
  };
}

export type { UpdatePartFormSubmitProps, UpdatePartFormState };
