import { CommandPartInputValue } from "../../dto";

interface FetchPartProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchPartProps {
  errorPartId?: string[];
  searchPartInputValue: string;
  businessId: string;
  handleUpdateSearchPartInputValue: (partData: CommandPartInputValue) => void;
}

export type { FetchPartProps, SearchPartProps };
