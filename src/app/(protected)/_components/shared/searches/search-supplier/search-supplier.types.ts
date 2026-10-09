import type { CommandSupplierInputValue } from "../../common.types";

interface FetchSupplierResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
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

export type { FetchSupplierResult, SearchSupplierProps };
