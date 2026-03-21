import type { CommandUserInputValue } from "../../common.types";

interface FetchUserProps {
  cursor?: string;
  businessId: string;
  signal?: AbortSignal;
}

interface FetchUserResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchUserProps {
  errorUserId?: string[];
  selectedUserId?: string;
  businessId: string;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  isOptional?: boolean;
}

export type { FetchUserProps, FetchUserResult, SearchUserProps };
