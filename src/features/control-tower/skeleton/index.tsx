import { Skeleton } from "@/components/ui/skeleton";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

/**
 * The tower while it loads, in the tower's own shape (UI-TWR-6): the toolbar
 * (company selector on /admin, Atualizar), the status badges, the map, the
 * routes on the street and the three widget columns. It used to be a table
 * skeleton, and the page jumped when the map arrived.
 */
const ControlTowerContentSkeleton = ({
  withSelector,
  withTrackingNote = true,
}: {
  withSelector: boolean;

  /** The foreground-only line under the badges (decision 7.3). */
  withTrackingNote?: boolean;
}): JSX.Element => (
  <div
    className="my-6 space-y-6"
    aria-busy="true"
    aria-label="Carregando a torre de controle"
  >
    <div className="flex w-full flex-wrap items-center gap-3">
      {withSelector && <Skeleton className="h-10 w-full sm:w-[270px]" />}
      <Skeleton className="h-9 w-full sm:ml-auto sm:w-28" />
    </div>

    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {withTrackingNote && <Skeleton className="h-4 w-full max-w-xl" />}

      <Skeleton className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]" />

      <Skeleton className="h-24 w-full rounded-lg" />

      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-64 w-full rounded-lg" />

        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>

        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  </div>
);

/** loading.tsx: the heading as the page draws it, then the content. */
const ControlTowerPageSkeleton = ({
  withSelector,
}: {
  withSelector: boolean;
}): JSX.Element => (
  <PageContainer>
    <div data-tutorial="loading" className="mb-8">
      <Skeleton className="mb-2 h-8 w-52" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>

    <ControlTowerContentSkeleton withSelector={withSelector} />
  </PageContainer>
);

export { ControlTowerContentSkeleton, ControlTowerPageSkeleton };
