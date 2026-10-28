"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

import { TowerViewBodySkeleton } from "../skeleton";

/**
 * The Torre's own client views, one chunk each (the panels moved from
 * Entregas are in deliveries/content/lazy-panels.tsx, the occurrences table
 * in deliveries/table).
 *
 * The page module imported the Painel (its widgets, socket and refetch
 * scheduler) and the authorization queue statically, so every view — Rotas,
 * the one most people open — downloaded them; with the views moved in, the
 * Torre's first load grew from 239 kB to 393 kB. Each is now fetched when its
 * view renders. The server still renders them (ssr stays on), so a full load
 * paints at once; the placeholders show only on a client-side switch, until
 * the chunk arrives.
 */
const PanelLoading = (): JSX.Element => (
  <div data-tutorial="loading" aria-busy="true">
    <TowerViewBodySkeleton view="panel" withTrackingNote={false} />
  </div>
);

const ControlTowerContent = dynamic(
  () => import("../content").then((module) => module.ControlTowerContent),
  { loading: PanelLoading },
);

// It draws nothing while nothing waits, so it waits for its chunk the same way.
const OccurrenceAuthorizationQueue = dynamic(
  () =>
    import("@/features/deliveries/occurrence-authorizations/queue").then(
      (module) => module.OccurrenceAuthorizationQueue,
    ),
  { loading: () => null },
);

/**
 * Ocorrências' action bar (Exportar, Atualizar), shared with Entregas: only
 * that view has it, so only that view downloads it and its exporters. Two
 * bars of the toolbar's height (h-9) hold the place.
 */
const DeliveriesPageActions = dynamic(
  () =>
    import("@/features/deliveries/page-actions").then(
      (module) => module.DeliveriesPageActions,
    ),
  {
    loading: () => (
      <div
        data-tutorial="loading"
        aria-busy="true"
        className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
      >
        <Skeleton className="h-9 w-full sm:w-[104px]" />
        <Skeleton className="h-9 w-full sm:w-[110px]" />
      </div>
    ),
  },
);

export {
  ControlTowerContent,
  DeliveriesPageActions,
  OccurrenceAuthorizationQueue,
};
