import type { CommandVehicleTypeInputValue } from "../../common.types";

interface FetchVehicleTypeResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchVehicleTypeProps {
  errorVehicleTypeId?: string[];
  searchVehicleTypeInputValue: string;
  businessId: string;
  handleUpdateSearchVehicleTypeInputValue: (
    vehicleTypeData: CommandVehicleTypeInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchVehicleTypeResult, SearchVehicleTypeProps };
