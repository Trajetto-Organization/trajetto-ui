import type { CommandFuelTypeInputValue } from "../../common.types";

interface FetchFuelTypeProps {
  cursor?: string;
  businessId?: string;
  signal?: AbortSignal;
}

interface FetchFuelTypeResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchFuelTypeProps {
  errorFuelTypeId?: string[];
  searchFuelTypeInputValue: string;
  businessId: string;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchFuelTypeProps, FetchFuelTypeResult, SearchFuelTypeProps };
