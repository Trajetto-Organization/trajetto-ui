import type { CommandPartInputValue } from "../../common.types";

interface FetchPartResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchPartProps {
  errorPartId?: string[];
  searchPartInputValue: string;
  businessId: string;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
  isOptional?: boolean;
}

export type { FetchPartResult, SearchPartProps };
