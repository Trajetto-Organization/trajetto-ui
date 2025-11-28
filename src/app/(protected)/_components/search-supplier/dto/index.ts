import { CommandSupplierInputValue } from "../../dto";

interface FetchSupplierProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchSupplierProps {
  errorSupplierId?: string[];
  searchSupplierInputValue: string;
  businessId: string;
  handleUpdateSearchSupplierInputValue: (
    supplierData: CommandSupplierInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchSupplierProps, SearchSupplierProps };
