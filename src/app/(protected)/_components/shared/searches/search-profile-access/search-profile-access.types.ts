import type { CommandProfileAccessInputValue } from "../../common.types";

interface FetchProfileResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchProfileAccessProps {
  errorProfileAccessId?: string[];
  searchProfileAccessInputValue: string;
  businessId: string;
  /**
   * Only the profiles whose permissions the viewer may change (the
   * permission form). The user form leaves it off: giving a colleague your
   * own profile is not a grant to yourself.
   */
  editableOnly?: boolean;
  handleUpdateSearchProfileAccessInputValue: (
    profileAccessData: CommandProfileAccessInputValue,
  ) => void;
}

export type { FetchProfileResult, SearchProfileAccessProps };
