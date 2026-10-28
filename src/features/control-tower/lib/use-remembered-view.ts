"use client";

import { useSyncExternalStore } from "react";

import {
  readRememberedTowerView,
  subscribeRememberedTowerView,
  type TowerView,
} from "./views";

/** The server knows no browser's choice: the bare link, then the choice. */
const noRememberedView = (): TowerView | null => null;

/**
 * The view this browser chose last, for a link into the Torre (the menu).
 * Null on the server and during hydration, so both renders agree; the
 * browser's choice right after, and again whenever it changes.
 */
function useRememberedTowerView(): TowerView | null {
  return useSyncExternalStore(
    subscribeRememberedTowerView,
    readRememberedTowerView,
    noRememberedView,
  );
}

export { useRememberedTowerView };
