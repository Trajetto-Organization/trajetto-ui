import { CommandBranchInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectBranchStepProps {
  commandBranchInputValue: CommandBranchInputValue;
  handleUpdateSearchBranchInputValue: (
    branchData: CommandBranchInputValue,
  ) => void;
  onContinue: () => void;
  businessId: string;
  errorBranchId?: string[];
  searchBranchIsOptional?: boolean;
}

export type { SelectBranchStepProps };
