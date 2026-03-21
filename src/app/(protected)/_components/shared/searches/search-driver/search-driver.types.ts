import type { CommandDriverInputValue } from "../../common.types";

interface SearchDriverProps {
  errorDriverId?: string[];
  selectedDriverId?: string;
  businessId: string;
  handleUpdateSearchDriverInputValue: (
    driverData: CommandDriverInputValue,
  ) => void;
  isOptional?: boolean;
}

interface FetchDriverProps {
  cursor?: string;
  businessId?: string;
  signal?: AbortSignal;
}

interface FetchDriverResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { SearchDriverProps, FetchDriverProps, FetchDriverResult };
