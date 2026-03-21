import {
  CommandBranchInputValue,
  CommandBusinessInputValue,
} from "@/app/(protected)/_components/shared/common.types";

interface SelectBusinessBranchStepProps {
  commandBusinessInputValue: CommandBusinessInputValue;
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
  errorBranchId?: string[];
  searchBranchIsOptional?: boolean;
}

export type { SelectBusinessBranchStepProps };
