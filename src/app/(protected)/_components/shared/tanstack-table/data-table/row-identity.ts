import type { RowSelectionState } from "@tanstack/react-table";

/**
 * Which record a table row is, so a selection stays on that record.
 *
 * Tanstack keys rows by position unless told otherwise. On a server-side
 * table every sort, filter or page brings a new array in a new order while
 * the DataTable stays mounted, so a selection keyed "row 0" moved to whatever
 * record the server put first: the batch "Atribuir motorista" then went to
 * deliveries nobody had checked.
 */

/** The record's own id, when it has one a row can be keyed by. */
function recordIdOf(row: unknown): string | undefined {
  if (!row || typeof row !== "object") return undefined;

  const id = (row as { id?: unknown }).id;

  if (typeof id === "string" && id !== "") return id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);

  return undefined;
}

/**
 * True when every row carries its own distinct id. Only then are rows keyed
 * by record; one missing or repeated id and the table keeps positions, since
 * two rows under one key would select (and render) as one.
 */
function rowsHaveRecordIds(rows: readonly unknown[]): boolean {
  const seen = new Set<string>();

  for (const row of rows) {
    const id = recordIdOf(row);

    if (id === undefined || seen.has(id)) return false;

    seen.add(id);
  }

  return true;
}

/**
 * The selection without the records the list no longer shows. The same
 * object when nothing is dropped, so a state update with it is a no-op.
 *
 * A checked record that left the page (another filter, another page) is
 * dropped rather than kept out of sight: the toolbar counts and acts on the
 * selection, and a row nobody can see must not be part of a batch.
 */
function keepListedSelection(
  selection: RowSelectionState,
  rows: readonly unknown[],
): RowSelectionState {
  const listed = new Set(rows.map(recordIdOf));
  const kept = Object.entries(selection).filter(([id]) => listed.has(id));

  return kept.length === Object.keys(selection).length
    ? selection
    : Object.fromEntries(kept);
}

export { keepListedSelection, recordIdOf, rowsHaveRecordIds };
