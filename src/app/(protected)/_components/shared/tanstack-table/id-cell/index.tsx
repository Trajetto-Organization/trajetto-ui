import { displayValue } from "@/lib/format-values";

/**
 * How many characters of a record id a table shows.
 *
 * The TAIL, not the head: the API mints UUIDv7, whose first 12 hex digits are
 * the creation time in milliseconds, so the first eight are the same for every
 * record made within the same minute. The last twelve are random. They are
 * also what the app already calls a service order elsewhere ("OS #…" in the
 * pickers and in Contas a pagar), so the same record reads the same everywhere.
 */
const SHORT_ID_LENGTH = 12;

/** The compact form of a record id (see SHORT_ID_LENGTH). */
function shortId(id: string): string {
  return id.slice(-SHORT_ID_LENGTH);
}

interface IdCellProps {
  id: string | null | undefined;
}

/**
 * The identifier cell of an entity with no business identifier (no code, no
 * number, no plate): the compact id in monospace, the full id in the tooltip
 * and for screen readers. Entities that have one show it instead; the full id
 * is still one click away in the row menu ("Copiar ID").
 */
function IdCell({ id }: IdCellProps) {
  if (!id) {
    return <p className="w-28 truncate font-medium">{displayValue(id)}</p>;
  }

  return (
    <p className="w-28 truncate font-mono text-sm font-medium" title={id}>
      <span aria-hidden="true">{shortId(id)}</span>
      <span className="sr-only">{id}</span>
    </p>
  );
}

export { IdCell, SHORT_ID_LENGTH, shortId };
