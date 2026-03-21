import { useEffect, useRef, useState } from "react";

import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { toast } from "sonner";

interface UseTableProps {
  responseError: {
    error: boolean;
    errorMessage: string;
  };
}

function useTable({ responseError }: UseTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

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
    sorting,
    setSorting,
  };
}

export { useTable };
