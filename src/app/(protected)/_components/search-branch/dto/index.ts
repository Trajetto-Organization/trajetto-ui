import { CommandBranchInputValue } from "../../dto";

interface SearchBranchProps {
  errorBranchId?: string[];
  searchBranchInputValue: string;
  businessId: string;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  isOptional?: boolean;
}

interface FetchBranchProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

export type { SearchBranchProps, FetchBranchProps };
