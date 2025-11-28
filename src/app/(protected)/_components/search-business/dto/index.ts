import { CommandBusinessInputValue } from "../../dto";

interface SearchBusinessProps {
  errorBusinessId?: string[];
  searchBusinessInputValue: string;
  handleUpdateSearchBussinessInputValue: (
    searchBusinessData: CommandBusinessInputValue,
  ) => void;
}

interface FetchBusinessProps {
  pageParam: number;
  signal?: AbortSignal;
}

export type { SearchBusinessProps, FetchBusinessProps };
