import { Skeleton } from "@/components/ui/skeleton";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

import { DEFAULT_TOWER_VIEW, type TowerView } from "../lib/views";

/** The rows of a table: header, eight ragged rows, then the pagination. */
const TableRowsSkeleton = (): JSX.Element => (
  <>
    <div className="rounded-md border">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-5 flex-1" />
        ))}
      </div>

      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: 5 }).map((_, column) => (
              <Skeleton
                key={column}
                className="h-4 flex-1"
                // Derived from the cell, never random: the server and the
                // client must draw the same widths (hydration).
                style={{ maxWidth: `${62 + ((row * 7 + column * 13) % 38)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-8 w-full sm:w-64" />
    </div>
  </>
);

/** Cards over the content, as DeliveriesStats lays them out. */
const CardsSkeleton = ({ count }: { count: number }): JSX.Element => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, index) => (
      <Skeleton key={index} className="h-[142px] rounded-lg" />
    ))}
  </div>
);

/**
 * The body of one view while it loads, in that view's own shape. The Torre's
 * fallback always drew Rotas' — six cards over the board — so opening
 * Atendimentos or Auditoria showed one layout and jumped to another.
 * Generic shapes, not the views' components: this file stays hook-free and
 * server-safe (loading.tsx and the page's Suspense render it).
 */
const TowerViewBodySkeleton = ({
  view,
  withTrackingNote = true,
}: {
  view: TowerView;
  /** The foreground-only line of the Painel view (decision 7.3). */
  withTrackingNote?: boolean;
}): JSX.Element => {
  if (view === "panel") {
    return (
      <div className="space-y-6">
        {withTrackingNote && <Skeleton className="h-4 w-full max-w-xl" />}

        {/* The map, as tall as the live one. */}
        <Skeleton className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]" />

        <Skeleton className="h-24 w-full rounded-lg" />

        <div className="grid gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (view === "occurrences") {
    return (
      <div className="space-y-6">
        <CardsSkeleton count={3} />

        <div className="my-9 space-y-4">
          {/* The feed's toolbar: search, the filters, the view menu. */}
          <div className="flex w-full flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-full sm:w-[270px]" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-28" />
            ))}
            <Skeleton className="h-8 w-full sm:ml-auto sm:w-28" />
          </div>

          <TableRowsSkeleton />
        </div>
      </div>
    );
  }

  if (view === "tickets") {
    // The two panes, at the height the live panel takes (chat/index.tsx).
    return (
      <div className="flex h-[calc(100dvh-388px)] min-h-[460px] overflow-hidden rounded-lg border">
        <div className="w-full space-y-3 p-3 lg:w-96 lg:shrink-0 lg:border-r">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-md" />
          ))}
        </div>

        <div className="hidden flex-1 flex-col gap-3 p-4 lg:flex">
          <Skeleton className="h-10 w-1/2" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (view === "audit") {
    return (
      <div className="space-y-4">
        {/* The chips above the queue's cards. Its Atualizar is the
            header's, drawn by the frame below like every view's. */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 min-w-0 flex-1 sm:w-80 sm:flex-initial" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Rotas: the day's six numbers over the board by route.
  return (
    <div className="space-y-6">
      <CardsSkeleton count={6} />

      <div className="space-y-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
};

/**
 * The tower while it loads, in the tower's own shape (UI-TWR-6): the toolbar
 * (company selector on /admin, Atualizar), the views strip, the cadence and
 * full-screen row (meeting of 14/10/2026), then the body of the view being
 * opened — the default one, Rotas, when the page cannot tell. It used to be
 * a table skeleton, and the page jumped when the content arrived.
 */
const ControlTowerContentSkeleton = ({
  withSelector,
  withTrackingNote = true,
  view = DEFAULT_TOWER_VIEW,
}: {
  withSelector: boolean;

  /** The foreground-only line of the Painel view (decision 7.3). */
  withTrackingNote?: boolean;

  /** The view the URL opens, when the page knows it. */
  view?: TowerView;
}): JSX.Element => (
  <div
    className="my-6 space-y-6"
    aria-busy="true"
    aria-label="Carregando a torre de controle"
    data-skeleton-view={view}
  >
    <div className="space-y-3">
      <div className="flex w-full flex-wrap items-center gap-3">
        {withSelector && <Skeleton className="h-10 w-full sm:w-[270px]" />}
        <Skeleton className="h-9 w-full sm:ml-auto sm:w-28" />
      </div>

      {/* The views strip: one bar with the five views inside. */}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>

    {/* Atualiza a cada N min · "Atualizar a cada" and its select · Tela
        cheia, with the live row's gaps. */}
    <div
      data-skeleton-live
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <Skeleton className="h-4 w-56" />
      <div className="flex items-center gap-2 sm:ml-auto">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-[88px]" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>

    <TowerViewBodySkeleton view={view} withTrackingNote={withTrackingNote} />
  </div>
);

/** loading.tsx: the heading as the page draws it, then the content. */
const ControlTowerPageSkeleton = ({
  withSelector,
  view,
}: {
  withSelector: boolean;
  /** The view being opened (route-loading.tsx reads it from the URL). */
  view?: TowerView;
}): JSX.Element => (
  <PageContainer>
    <div data-tutorial="loading" className="mb-8">
      <Skeleton className="mb-2 h-8 w-52" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>

    <ControlTowerContentSkeleton withSelector={withSelector} view={view} />
  </PageContainer>
);

export {
  ControlTowerContentSkeleton,
  ControlTowerPageSkeleton,
  TowerViewBodySkeleton,
};
