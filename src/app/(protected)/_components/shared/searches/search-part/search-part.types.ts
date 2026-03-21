import type { CommandPartInputValue } from "../../common.types";

interface FetchPartProps {
  cursor?: string;
  businessId?: string;
  signal?: AbortSignal;
}

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

export type { FetchPartProps, FetchPartResult, SearchPartProps };
