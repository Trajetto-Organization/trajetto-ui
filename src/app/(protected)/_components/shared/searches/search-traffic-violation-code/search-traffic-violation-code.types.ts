import type { CommandTrafficViolationCodeInputValue } from "../../common.types";

interface FetchTrafficViolationCodeResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** A picked code, with its points so the fine form can suggest them. */
interface TrafficViolationCodeChoice extends CommandTrafficViolationCodeInputValue {
  points?: number;
}

interface SearchTrafficViolationCodeProps {
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeInputValue: string;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: TrafficViolationCodeChoice,
  ) => void;
  isOptional?: boolean;
}

export type {
  FetchTrafficViolationCodeResult,
  SearchTrafficViolationCodeProps,
  TrafficViolationCodeChoice,
};
