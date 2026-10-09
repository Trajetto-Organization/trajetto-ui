import type { CommandBranchInputValue } from "../../common.types";

interface SearchBranchProps {
  errorBranchId?: string[];
  searchBranchInputValue: string;
  businessId: string;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  isOptional?: boolean;
}

interface FetchBranchResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { SearchBranchProps, FetchBranchResult };
