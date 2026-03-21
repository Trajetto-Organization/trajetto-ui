import { CommandUserInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectUserStepProps {
  businessId: string;
  commandUserInputValue: CommandUserInputValue;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  onContinue: () => void;
  onBack: () => void;
  errorUserId?: string[];
  searchUserIsOptional?: boolean;
}

export type { SelectUserStepProps };
