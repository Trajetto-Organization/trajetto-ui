import type { CommandServiceOrderInputValue } from "../../common.types";

interface FetchServiceOrderProps {
  cursor?: string;
  businessId?: string;
  signal?: AbortSignal;
}

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

export type {
  FetchServiceOrderProps,
  FetchServiceOrderResult,
  SearchServiceOrderProps,
};
