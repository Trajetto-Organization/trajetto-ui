import { CommandVehicleInputValue } from "../../dto";

interface FetchVehicleProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchVehicleProps {
  errorVehicleId?: string[];
  selectedVehicleId?: string;
  businessId: string;
  handleUpdateSearchVehicleInputValue: (
    vehicleData: CommandVehicleInputValue,
  ) => void;
}

export type { FetchVehicleProps, SearchVehicleProps };
