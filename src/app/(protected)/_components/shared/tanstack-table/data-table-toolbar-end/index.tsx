"use client";

import type { ReactNode } from "react";
import type { Table } from "@tanstack/react-table";

import { cn } from "@/lib/utils";

import { DataTableViewOptions } from "../data-table-view-options";

interface DataTableToolbarEndProps<TData> {
  /** The table, for Visualizar (DataTable injects it into the toolbar). */
  table?: Table<TData>;
  /** A failed read hides Visualizar: there are no columns to toggle. */
  error?: boolean;
  /** What sits just before Visualizar: a period, for instance. */
  children?: ReactNode;
  className?: string;
}

/**
 * The right end of a table toolbar: the controls that frame the whole list
 * (a period) and Visualizar, as ONE group.
 *
 * The period used to have a line of its own above the search and the
 * filters, and Visualizar was a separate `ml-auto` child — so the two could
 * never share a line, nor move together when the line ran out. As a group
 * pushed right with `sm:ml-auto`, it sits on the filters' line while there
 * is room and moves to the next line whole, still on the right, when there
 * is not; only a line narrower than the group itself wraps it inside. On a
 * phone each piece takes the full width, like the rest of the toolbar.
 *
 * A failed read hides Visualizar only: the period stays, because a shorter
 * period is the way out of a read that timed out.
 */
function DataTableToolbarEnd<TData>({
  table,
  error,
  children,
  className,
}: DataTableToolbarEndProps<TData>): JSX.Element | null {
  const withViewOptions = !error && Boolean(table);

  if (!children && !withViewOptions) return null;

  return (
    <div
      data-toolbar-end
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end",
        className,
      )}
    >
      {children}

      {withViewOptions && table && (
        <div className="w-full sm:w-auto">
          <DataTableViewOptions table={table} />
        </div>
      )}
    </div>
  );
}

export { DataTableToolbarEnd };
