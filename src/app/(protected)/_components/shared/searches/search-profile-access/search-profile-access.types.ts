import type { CommandProfileAccessInputValue } from "../../common.types";

interface FetchProfileProps {
  cursor?: string;
  businessId?: string;
  signal?: AbortSignal;
}

interface FetchProfileResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchProfileAccessProps {
  errorProfileAccessId?: string[];
  searchProfileAccessInputValue: string;
  businessId: string;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
}

export type { FetchProfileProps, FetchProfileResult, SearchProfileAccessProps };
