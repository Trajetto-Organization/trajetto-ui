import { CommandVehicleTypeInputValue } from "../../dto";

interface FetchVehicleTypeProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
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

export type { FetchVehicleTypeProps, SearchVehicleTypeProps };
