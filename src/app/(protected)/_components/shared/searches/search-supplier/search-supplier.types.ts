import type { CommandSupplierInputValue } from "../../common.types";

interface FetchSupplierProps {
  cursor?: string;
  businessId: string;
  signal?: AbortSignal;
}

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

export type { FetchSupplierProps, FetchSupplierResult, SearchSupplierProps };
