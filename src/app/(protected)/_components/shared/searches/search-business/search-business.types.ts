import type { CommandBusinessInputValue } from "../../common.types";

interface SearchBusinessProps {
  /**
   * The field's label, with its marker (decision 3.3): "Nome *" required,
   * "Nome (opcional)" optional. Defaults to "Selecione a empresa *".
   */
  label?: string;
  errorBusinessId?: string[];
  searchBusinessInputValue: string;
  handleUpdateSearchBussinessInputValue: (
    searchBusinessData: CommandBusinessInputValue,
  ) => void;
}

interface FetchBusinessResult {
  data: any[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type { SearchBusinessProps, FetchBusinessResult };
