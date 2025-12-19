import { CommandUserInputValue } from "../../dto";

interface FetchUserProps {
  pageParam: number;
  businessId: string;
  signal?: AbortSignal;
}

interface SearchUserProps {
  errorUserId?: string[];
  selectedUserId?: string;
  businessId: string;
  handleUpdateSearchUserInputValue: (userData: CommandUserInputValue) => void;
  isOptional?: boolean;
}

export type { FetchUserProps, SearchUserProps };
