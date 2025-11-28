import { CommandServiceOrderInputValue } from "../../dto";

interface FetchServiceOrderProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchServiceOrderProps {
  errorServiceOrderId?: string[];
  searchServiceOrderInputValue: string;
  businessId: string;
  handleUpdateSearchServiceOrderInputValue: (
    serviceOrderData: CommandServiceOrderInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchServiceOrderProps, SearchServiceOrderProps };
