import { CommandFuelTypeInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectFuelTypeStepProps {
  businessId: string;
  commandFuelTypeInputValue: CommandFuelTypeInputValue;
  handleUpdateSearchFuelTypeInputValue: (
    fuelTypeData: CommandFuelTypeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorFuelTypeId?: string[];
  searchFuelTypeIsOptional?: boolean;
}

export type { SelectFuelTypeStepProps };
