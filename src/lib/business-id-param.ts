/**
 * The company picked in the address bar (`?businessId=`), when it is one.
 *
 * The value becomes a SEGMENT of the API paths the screen then calls with the
 * viewer's own token. Taken raw, a crafted link could make somebody else's
 * session call a path of the sender's choosing (`../../…`). A company id is a
 * UUID; anything else is treated exactly like no selection at all — the
 * session's company, or the "choose a company" state for a master.
 *
 * Whether the viewer may act on that company is still the API's call; this
 * only makes sure it is a company id being asked about.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readBusinessIdParam(
  value: string | null | undefined,
): string | undefined {
  return typeof value === "string" && UUID_PATTERN.test(value)
    ? value
    : undefined;
}
