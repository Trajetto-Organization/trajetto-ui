import { useEffect, useRef, useState } from "react";

import {
  ColumnFiltersState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

interface UseTableProps {
  responseError: {
    error: boolean;
    errorMessage: string;
  };
  /** Columns that start hidden (still listed under "Visualizar"). */
  initialColumnVisibility?: VisibilityState;
}

/**
 * The table's local UI state. Sorting is not here: a list sorts on the
 * server (DataTable's `server` spec, state in the URL) or not at all.
 */
function useTable({ responseError, initialColumnVisibility }: UseTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const toastDisplayed = useRef(false);

  useEffect(() => {
    if (responseError.error && !toastDisplayed.current) {
      toast.error(responseError.errorMessage);
      toastDisplayed.current = true;
    }
  }, [responseError]);

  return {
    rowSelection,
    setRowSelection,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
  };
}

export { useTable };
