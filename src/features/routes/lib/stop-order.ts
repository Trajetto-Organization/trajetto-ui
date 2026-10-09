/**
 * The route page's local order (decision 14.7, D6): pure, so an off-by-one
 * that would silently give a driver another street order is caught by a test
 * instead of on the road.
 */

/** Moves the item at `from` to `to` (both 0-based); null when out of range. */
function moveTo<T>(list: readonly T[], from: number, to: number): T[] | null {
  if (from < 0 || from >= list.length) return null;
  if (to < 0 || to >= list.length) return null;

  const next = [...list];
  const [item] = next.splice(from, 1);

  next.splice(to, 0, item);

  return next;
}

/** Same ids in the same order. */
function isSameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * The order to show after the server answered: the server's, unless the
 * dispatcher has an unsaved one for exactly the same set of stops — a set
 * that changed (a colleague added or removed one) makes the local order
 * meaningless, and it is dropped rather than merged.
 */
function reconcileOrder(
  serverIds: readonly string[],
  localIds: readonly string[] | null,
): string[] {
  if (!localIds) return [...serverIds];

  const server = new Set(serverIds);

  if (
    localIds.length !== server.size ||
    localIds.some((id) => !server.has(id))
  ) {
    return [...serverIds];
  }

  return [...localIds];
}

/**
 * Which stops a drag may move: only the ones nobody worked yet. An arrived,
 * delivered or failed stop is a record, not a plan (§5.3).
 */
function isStopDraggable(status: string, editable: boolean): boolean {
  return editable && status === "PENDING";
}

/**
 * What a screen reader hears when a stop moves (dnd-kit announcements), in
 * Portuguese and with the position, never the raw id.
 */
function stopMoveAnnouncement(
  label: string,
  position: number,
  total: number,
): string {
  return `${label} movida para a posição ${position} de ${total}.`;
}

export {
  isSameOrder,
  isStopDraggable,
  moveTo,
  reconcileOrder,
  stopMoveAnnouncement,
};
