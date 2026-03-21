import type { CommandVehicleInputValue } from "../../common.types";

interface FetchVehicleProps {
  cursor?: string;
  businessId: string;
  signal?: AbortSignal;
}

interface FetchVehicleResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchVehicleProps {
  errorVehicleId?: string[];
  selectedVehicleId?: string;
  businessId: string;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchVehicleProps, FetchVehicleResult, SearchVehicleProps };
