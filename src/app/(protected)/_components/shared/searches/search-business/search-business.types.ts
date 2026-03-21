import type { CommandBusinessInputValue } from "../../common.types";

interface SearchBusinessProps {
  errorBusinessId?: string[];
  searchBusinessInputValue: string;
  handleUpdateSearchBussinessInputValue: (
    searchBusinessData: CommandBusinessInputValue,
  ) => void;
}

interface FetchBusinessProps {
  cursor?: string;
  signal?: AbortSignal;
}

interface FetchBusinessResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { SearchBusinessProps, FetchBusinessProps, FetchBusinessResult };
