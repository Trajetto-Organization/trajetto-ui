import { create } from "zustand";

interface ConnectionState {
  /** True while the API could not be reached at all, or answered a 5xx. */
  isUnreachable: boolean;
  setUnreachable: (isUnreachable: boolean) => void;
}

/**
 * Whether the API is currently answering.
 *
 * Deliberately separate from the forced-logout state, because the two mean
 * opposite things. A forced logout is an authoritative negative: the server
 * said this session is not valid. This is the absence of an answer — we know
 * nothing, and the session is very likely still fine.
 *
 * Treating them the same is what would log a driver out because a container
 * restarted. The API is the enforcement point for every action, so someone
 * sitting on a stale dashboard while it is down can do exactly nothing; the
 * moment it answers again, a revoked session is kicked properly.
 */
const useConnectionStore = create<ConnectionState>((set) => ({
  isUnreachable: false,
  setUnreachable: (isUnreachable) => set({ isUnreachable }),
}));

/**
 * The delay before each retry, in milliseconds.
 *
 * Quick at first, because most outages are a deploy or a blip and resolve in
 * seconds. Then it backs off and settles, so a long outage is not answered by
 * one browser hammering a backend that is already struggling to come up.
 */
const RETRY_SCHEDULE_MS = [3000, 6000, 12000, 20000];

function getRetryDelay(attempt: number): number {
  return RETRY_SCHEDULE_MS[Math.min(attempt, RETRY_SCHEDULE_MS.length - 1)];
}

export { useConnectionStore, getRetryDelay };
