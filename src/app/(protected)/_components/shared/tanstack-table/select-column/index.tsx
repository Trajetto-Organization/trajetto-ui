"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Checkbox } from "@/components/ui/checkbox";

/** The id of the selection column; the DataTable puts it first. */
const SELECT_COLUMN_ID = "select";

interface SelectColumnOptions {
  /** Guided-tour anchor on the "select all" checkbox. */
  dataTutorial?: string;
}

/**
 * The checkbox column of a table whose rows feed a bulk action. Not written
 * by hand in a column list: the DataTable adds it when it is given
 * `bulkActions`, so a checkbox never appears where nothing acts on it.
 */
function selectColumn<TData>({
  dataTutorial,
}: SelectColumnOptions = {}): ColumnDef<TData> {
  return {
    id: SELECT_COLUMN_ID,
    meta: { title: "Seleção" },
    header: ({ table }) => (
      <Checkbox
        id="select-all-rows"
        name="select-all-rows"
        data-tutorial={dataTutorial}
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todas as linhas"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        id={`select-row-${row.id}`}
        name={`select-row-${row.id}`}
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

export { SELECT_COLUMN_ID, selectColumn };
