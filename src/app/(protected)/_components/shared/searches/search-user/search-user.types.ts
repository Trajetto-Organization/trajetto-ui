import type { CommandUserInputValue } from "../../common.types";

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

export type { FetchUserResult, SearchUserProps };
