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

interface FetchDriverResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { SearchDriverProps, FetchDriverResult };
