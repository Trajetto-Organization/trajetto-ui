import type { CommandTrafficViolationCodeInputValue } from "../../common.types";

interface FetchTrafficViolationCodeProps {
  cursor?: string;
  signal?: AbortSignal;
}

interface FetchTrafficViolationCodeResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchTrafficViolationCodeProps {
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeInputValue: string;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  isOptional?: boolean;
}

export type {
  FetchTrafficViolationCodeProps,
  FetchTrafficViolationCodeResult,
  SearchTrafficViolationCodeProps,
};
