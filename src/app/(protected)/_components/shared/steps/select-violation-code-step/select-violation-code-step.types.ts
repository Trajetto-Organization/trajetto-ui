import { CommandTrafficViolationCodeInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectViolationCodeStepProps {
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeIsOptional?: boolean;
}

export type { SelectViolationCodeStepProps };
