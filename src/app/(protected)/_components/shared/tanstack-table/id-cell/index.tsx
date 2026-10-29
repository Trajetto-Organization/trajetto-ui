import type { ColumnDef } from "@tanstack/react-table";

// The compact id lives with the other formatters, so the labels and pickers
// outside a table cut it the same way (SHORT_ID_LENGTH says which part).
import { SHORT_ID_LENGTH, displayValue, shortId } from "@/lib/format-values";
import { cn } from "@/lib/utils";

import { DataTableColumnHeader } from "../data-table-collumn-header";

interface IdCellProps {
  id: string | null | undefined;
  /** Visible label before the id ("OS #"); read by screen readers too. */
  prefix?: string;
  /** Width and spacing; the default fits the twelve characters. */
  className?: string;
}

/**
 * A record id as every table shows it: the compact id in monospace, the full
 * id in the tooltip and for screen readers. The abbreviation is presentation
 * only: "Copiar ID" in the row menu copies the full value
 * (lib/copy-with-feedback).
 */
function IdCell({ id, prefix, className }: IdCellProps) {
  if (!id) {
    return (
      <p className={cn("w-28 truncate font-medium", className)}>
        {displayValue(id)}
      </p>
    );
  }

  const full = prefix ? `${prefix}${id}` : id;

  return (
    <p
      className={cn("w-28 truncate font-mono text-sm font-medium", className)}
      title={full}
    >
      {/* The reader's copy first and out of mouse selections: after the
          tail, a double click on the tail selected the two as one word and
          copied the tail glued to the full id's head ("…abe601a1809d"). */}
      <span className="sr-only select-none">{full}</span>
      <span aria-hidden="true">{`${prefix ?? ""}${shortId(id)}`}</span>
    </p>
  );
}

/** The id of the record-id column, first in every record table. */
const ID_COLUMN_ID = "id";

/**
 * The record-id column, the first of every table that lists records with an
 * id of their own (spec §5): titled "ID", rendered by IdCell, never hidden
 * through "Visualizar" (the id must always be there to quote and to search
 * by). It does not sort: no list orders by its key, and on a server table the
 * DataTable decides that from the spec anyway (ServerTableSpec.sortable).
 *
 * The business identifier (código, placa, CNPJ, e-mail) keeps its own column
 * after this one: it is another value, not the same one.
 *
 * `read` names the id when the row's own `id` is not the record's.
 */
function idColumn<TData extends { id?: string | null }>(): ColumnDef<TData>;
function idColumn<TData>(
  read: (row: TData) => string | null | undefined,
): ColumnDef<TData>;
function idColumn<TData>(
  read?: (row: TData) => string | null | undefined,
): ColumnDef<TData> {
  const idOf =
    read ?? ((row: TData) => (row as { id?: string | null }).id ?? null);

  return {
    id: ID_COLUMN_ID,
    accessorFn: (row) => idOf(row) ?? "",
    meta: { title: "ID" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => <IdCell id={idOf(row.original)} />,
    enableSorting: false,
    enableHiding: false,
  };
}

export { ID_COLUMN_ID, IdCell, SHORT_ID_LENGTH, idColumn, shortId };
