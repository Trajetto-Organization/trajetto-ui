import { CommandDriverInputValue } from "../../dto";

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
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

export type { SearchDriverProps, FetchDriverProps };
