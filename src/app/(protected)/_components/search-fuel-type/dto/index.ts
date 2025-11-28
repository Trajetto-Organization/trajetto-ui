import { CommandFuelTypeInputValue } from "../../dto";

interface FetchFuelTypeProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchFuelTypeProps {
  errorFuelTypeId?: string[];
  searchFuelTypeInputValue: string;
  businessId: string;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
}

export type { FetchFuelTypeProps, SearchFuelTypeProps };
