import type { CommandServiceOrderInputValue } from "../../common.types";

interface FetchServiceOrderResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
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

export type { FetchServiceOrderResult, SearchServiceOrderProps };
