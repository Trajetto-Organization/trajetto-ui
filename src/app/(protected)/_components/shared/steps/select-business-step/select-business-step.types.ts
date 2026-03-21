import { CommandBusinessInputValue } from "@/app/(protected)/_components/shared/common.types";

interface SelectBusinessStepProps {
  commandBusinessInputValue: CommandBusinessInputValue;
  handleUpdateSearchBusinessInputValue: (
    businessData: CommandBusinessInputValue,
  ) => void;
  onContinue: () => void;
  errorBusinessId?: string[];
}

export type { SelectBusinessStepProps };
