"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient, type Query } from "react-query";
import { useRouter } from "next/navigation";

import { isCoveredByDialog, RETRY_MS } from "@/hooks/use-route-events";

import { TICKETS_QUERY_ROOT } from "@/features/deliveries/chat/lib/ticket-keys";
import { AUTHORIZATION_QUEUE_ROOT } from "@/features/deliveries/occurrence-authorizations/keys";

import {
  DEFAULT_TOWER_REFRESH_MINUTES,
  type TowerRefreshMinutes,
} from "../lib/refresh-interval";
import type { TowerView } from "../lib/views";

/**
 * What each view reads in the browser, by react-query root: the Torre's
 * timer refetches these (only the ones on screen ask the API again).
 */
const TOWER_VIEW_QUERY_ROOTS: Record<TowerView, readonly string[]> = {
  routes: ["route_monitoring"],
  panel: ["control_tower", "driver_trail", AUTHORIZATION_QUEUE_ROOT],
  occurrences: [],
  tickets: [TICKETS_QUERY_ROOT],
  audit: ["proof_audit"],
};

/**
 * The views the server renders part of — the board's six cards, the
 * occurrences table — which only a `router.refresh()` reads again.
 */
const SERVER_FED_TOWER_VIEWS: ReadonlySet<TowerView> = new Set<TowerView>([
  "routes",
  "occurrences",
]);

interface TowerRefresh {
  minutes: TowerRefreshMinutes;
}

const TowerRefreshContext = createContext<TowerRefresh | null>(null);

/**
 * The Torre's cadence, for a view that names it ("a torre se atualiza a cada
 * 1 min"). Outside the Torre (a test, another page), the default.
 */
function useTowerRefresh(): TowerRefresh {
  return (
    useContext(TowerRefreshContext) ?? {
      minutes: DEFAULT_TOWER_REFRESH_MINUTES,
    }
  );
}

function rootOf(query: Query): unknown {
  return Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
}

/**
 * Reads the view on screen again every `minutes`: its queries refetched,
 * and the server's part re-rendered where there is one. Held while a dialog
 * is open (a re-render could take it along, see use-route-events) and while
 * the tab is hidden — then caught up as soon as it is shown again.
 *
 * `live` false — the company prompt, a refusal — schedules nothing: there
 * is no view to read again, and a `router.refresh()` every minute would
 * re-render the whole page on the server to draw the same sentence.
 */
function useTowerAutoRefresh(
  view: TowerView,
  minutes: TowerRefreshMinutes,
  live = true,
): void {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!live) return;

    let held: ReturnType<typeof setInterval> | null = null;
    let missedWhileHidden = false;

    const roots = TOWER_VIEW_QUERY_ROOTS[view];

    const refresh = () => {
      if (document.visibilityState === "hidden") {
        missedWhileHidden = true;
        return;
      }

      if (isCoveredByDialog()) {
        if (!held) held = setInterval(refresh, RETRY_MS);
        return;
      }

      if (held) {
        clearInterval(held);
        held = null;
      }

      if (SERVER_FED_TOWER_VIEWS.has(view)) router.refresh();

      if (roots.length > 0) {
        void queryClient.invalidateQueries({
          predicate: (query) => roots.includes(rootOf(query) as string),
        });
      }
    };

    const timer = setInterval(refresh, minutes * 60_000);

    const onVisibility = () => {
      if (document.visibilityState === "visible" && missedWhileHidden) {
        missedWhileHidden = false;
        refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      if (held) clearInterval(held);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [view, minutes, live, queryClient, router]);
}

/** When the view on screen was last read, and in which zone to say it. */
interface TowerLastUpdate {
  /** Epoch ms. */
  at: number;
  /**
   * The company's IANA zone, when the view's own data names it (the board
   * and the map answer with `timeZone`, the zone their times are shown in).
   * Undefined: the view shows the viewer's clock, and so does this.
   */
  timeZone: string | undefined;
}

/** The `timeZone` a view's answer carries, if any (route board, map). */
function timeZoneOf(data: unknown): string | undefined {
  const zone = (data as { timeZone?: unknown } | null | undefined)?.timeZone;

  return typeof zone === "string" && zone !== "" ? zone : undefined;
}

/**
 * When the view on screen was last read: the newest answer among its
 * ACTIVE queries — the ones a mounted part of this view observes — or the
 * server's render for the part it feeds. Null until the browser knows
 * (never rendered on the server).
 *
 * Only active ones: the cache still holds what other views and, on /admin,
 * the previous company answered (each panel is keyed by company, so its
 * queries go inactive on a switch), and the newest of those said
 * "Atualizado às" for a screen that was not this one.
 */
function useTowerLastUpdate(
  view: TowerView,
  renderedAt: number,
): TowerLastUpdate | null {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<TowerLastUpdate | null>(null);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const roots = TOWER_VIEW_QUERY_ROOTS[view];

    const compute = () => {
      let at = SERVER_FED_TOWER_VIEWS.has(view) ? renderedAt : 0;
      let timeZone: string | undefined;

      for (const query of cache.findAll({
        predicate: (candidate) =>
          candidate.isActive() && roots.includes(rootOf(candidate) as string),
      })) {
        at = Math.max(at, query.state.dataUpdatedAt);
        timeZone ??= timeZoneOf(query.state.data);
      }

      const next = at > 0 ? { at, timeZone } : null;

      setLastUpdate((previous) =>
        previous?.at === next?.at && previous?.timeZone === next?.timeZone
          ? previous
          : next,
      );
    };

    compute();

    return cache.subscribe(compute);
  }, [queryClient, view, renderedAt]);

  return lastUpdate;
}

export {
  SERVER_FED_TOWER_VIEWS,
  TOWER_VIEW_QUERY_ROOTS,
  TowerRefreshContext,
  useTowerAutoRefresh,
  useTowerLastUpdate,
  useTowerRefresh,
  type TowerLastUpdate,
  type TowerRefresh,
};
