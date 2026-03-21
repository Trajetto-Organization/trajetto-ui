import type { CommandVehicleTypeInputValue } from "../../common.types";

interface FetchVehicleTypeProps {
  cursor?: string;
  businessId: string;
  signal?: AbortSignal;
}

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

export type {
  FetchVehicleTypeProps,
  FetchVehicleTypeResult,
  SearchVehicleTypeProps,
};
