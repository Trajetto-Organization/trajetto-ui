/**
 * How often the Torre reads its views again (product meeting of 14/10/2026).
 *
 * Every minute by default, or every 3 or 5, chosen per browser: a TV on the
 * wall of the operation wants the minute, a dispatcher's second monitor may
 * settle for less. The socket stays: positions and route events still land
 * the instant they happen, and this is the floor for everything else. It
 * replaced the panel's fixed 30 seconds (2,880 reads a shift for a funnel
 * that moves a few times an hour) and the boards that only moved on events.
 */

const TOWER_REFRESH_MINUTES = [1, 3, 5] as const;

type TowerRefreshMinutes = (typeof TOWER_REFRESH_MINUTES)[number];

const DEFAULT_TOWER_REFRESH_MINUTES: TowerRefreshMinutes = 1;

const TOWER_REFRESH_STORAGE_KEY = "trajetto:control-tower:refresh-minutes";

function isTowerRefreshMinutes(value: unknown): value is TowerRefreshMinutes {
  return (TOWER_REFRESH_MINUTES as readonly unknown[]).includes(value);
}

/** The interval this browser chose, or the default (storage refused or empty). */
function readTowerRefreshMinutes(): TowerRefreshMinutes {
  try {
    const stored = Number(
      window.localStorage.getItem(TOWER_REFRESH_STORAGE_KEY),
    );

    return isTowerRefreshMinutes(stored)
      ? stored
      : DEFAULT_TOWER_REFRESH_MINUTES;
  } catch {
    return DEFAULT_TOWER_REFRESH_MINUTES;
  }
}

function writeTowerRefreshMinutes(minutes: TowerRefreshMinutes): void {
  try {
    window.localStorage.setItem(TOWER_REFRESH_STORAGE_KEY, String(minutes));
  } catch {
    // Storage refused: the choice holds for this visit only.
  }
}

/** "Atualiza a cada 1 min". */
function refreshCadenceLabel(minutes: TowerRefreshMinutes): string {
  return `Atualiza a cada ${minutes} min`;
}

export {
  DEFAULT_TOWER_REFRESH_MINUTES,
  TOWER_REFRESH_MINUTES,
  TOWER_REFRESH_STORAGE_KEY,
  isTowerRefreshMinutes,
  readTowerRefreshMinutes,
  refreshCadenceLabel,
  writeTowerRefreshMinutes,
  type TowerRefreshMinutes,
};
