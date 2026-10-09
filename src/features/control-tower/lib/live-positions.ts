/**
 * The tower's live dots only ever move forward in time.
 *
 * `driverPosition` events arrive in whatever order the network delivers them:
 * two flushes of the same phone answered by different API replicas, or an
 * outbox resending an older batch after a newer one. Taking every event as
 * the latest drew the truck back where it was minutes ago, until the next
 * ping or the next refetch. Each event carries when the DEVICE recorded it,
 * and that is what decides.
 */

import type { TowerPosition } from "@/actions/control-tower/types";

/** Same window as the API's POSITION_FRESH_MS. */
const POSITION_FRESH_MS = 10 * 60 * 1000;

/** Whether `candidate` may replace `current`. The same instant is let through. */
function isNewerPosition(candidate: string, current?: string): boolean {
  if (!current) return true;

  const candidateAt = Date.parse(candidate);
  const currentAt = Date.parse(current);

  // An unreadable timestamp on either side is no reason to freeze the dot.
  if (Number.isNaN(candidateAt) || Number.isNaN(currentAt)) return true;

  return candidateAt >= currentAt;
}

/**
 * The live map after one more event — the SAME object when the event is older
 * than what is already there, so React skips the render.
 */
function mergeLivePosition<T extends { driverId: string; recordedAt: string }>(
  current: Record<string, T>,
  incoming: T,
): Record<string, T> {
  const stored = current[incoming.driverId];

  if (stored && !isNewerPosition(incoming.recordedAt, stored.recordedAt)) {
    return current;
  }

  return { ...current, [incoming.driverId]: incoming };
}

/** Recorded within the fresh window, by the DEVICE's clock. */
function isRecentlyRecorded(recordedAt: string, now: number): boolean {
  const at = Date.parse(recordedAt);

  return !Number.isNaN(at) && now - at <= POSITION_FRESH_MS;
}

interface LiveUpdate {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
}

/**
 * One dot as the map should draw it now: the socket's point when it is newer,
 * and the freshness recomputed from when the point was RECORDED.
 *
 * It used to be forced to fresh on arrival ("it arrived a moment ago, by
 * definition") — but a phone flushing a forty-minute backlog announces its
 * newest point, which can be forty minutes old (UI-TWR-4). And a dot fetched
 * fresh ages between two polls; recomputing here lets it turn grey on time.
 * A finished route's dot keeps its own state: its phone no longer reports.
 */
function applyLivePosition<T extends TowerPosition>(
  position: T,
  update: LiveUpdate | undefined,
  now: number,
): T {
  const merged =
    update && isNewerPosition(update.recordedAt, position.recordedAt)
      ? {
          ...position,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed,
          heading: update.heading,
          recordedAt: update.recordedAt,
        }
      : position;

  if (merged.state === "ended") return { ...merged, fresh: false };

  const fresh = isRecentlyRecorded(merged.recordedAt, now);

  return { ...merged, fresh, state: fresh ? "moving" : "silent" };
}

/**
 * Drivers the socket reported that the last read did not have: somebody
 * started a route since. Their name, plate and route only come with a read.
 */
function hasUnknownDriver(
  live: Record<string, { driverId: string }>,
  fetched: ReadonlyArray<{ driverId: string }>,
): boolean {
  const known = new Set(fetched.map((position) => position.driverId));

  return Object.keys(live).some((driverId) => !known.has(driverId));
}

export {
  POSITION_FRESH_MS,
  applyLivePosition,
  hasUnknownDriver,
  isNewerPosition,
  isRecentlyRecorded,
  mergeLivePosition,
};
export type { LiveUpdate };
