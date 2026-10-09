import type { CommandTrafficViolationCodeInputValue } from "@/app/(protected)/_components/shared/common.types";
import type { TrafficViolationCodeChoice } from "@/app/(protected)/_components/shared/searches/search-traffic-violation-code/search-traffic-violation-code.types";

interface SelectViolationCodeStepProps {
  commandTrafficViolationCodeInputValue: CommandTrafficViolationCodeInputValue;
  /** Receives the code's points too, so the fine form can suggest them. */
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: TrafficViolationCodeChoice,
  ) => void;
  onContinue: () => void;
  onBack: () => void;
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeIsOptional?: boolean;
}

export type { SelectViolationCodeStepProps };
