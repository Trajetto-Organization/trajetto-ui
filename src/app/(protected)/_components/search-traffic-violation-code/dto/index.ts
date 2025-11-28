import { CommandTrafficViolationCodeInputValue } from "../../dto";

interface FetchTrafficViolationCodeProps {
  pageParam: number;
  signal?: AbortSignal;
}

interface SearchTrafficViolationCodeProps {
  errorTrafficViolationCodeId?: string[];
  searchTrafficViolationCodeInputValue: string;
  handleUpdateSearchTrafficViolationCodeInputValue: (
    trafficViolationCodeData: CommandTrafficViolationCodeInputValue,
  ) => void;
  isOptional?: boolean;
}

export type { FetchTrafficViolationCodeProps, SearchTrafficViolationCodeProps };
