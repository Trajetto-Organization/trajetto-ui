import { CommandProfileAccessInputValue } from "../../dto";

interface FetchProfileProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchProfileAccessProps {
  errorProfileAccessId?: string[];
  searchProfileAccessInputValue: string;
  businessId: string;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
}

export type { FetchProfileProps, SearchProfileAccessProps };
