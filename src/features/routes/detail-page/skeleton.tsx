import { Skeleton } from "@/components/ui/skeleton";

interface RouteDetailSkeletonProps {
  /** /admin shows the company selector above. */
  withSelector?: boolean;
}

/**
 * The route page while it loads, in the page's own shape: the action row,
 * the header card, the stop list beside the map (stacked on a phone).
 */
const RouteDetailSkeleton = ({
  withSelector = false,
}: RouteDetailSkeletonProps): JSX.Element => (
  <div
    className="space-y-6 my-6"
    aria-busy="true"
    aria-label="Carregando a rota"
  >
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {withSelector ? <Skeleton className="h-10 w-full sm:w-72" /> : <span />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-10 w-full sm:w-44" />
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
    </div>

    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-36" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-9 w-full sm:w-28" />
        <Skeleton className="h-9 w-full sm:w-48" />
        <Skeleton className="h-9 w-full sm:w-32" />
      </div>
    </div>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>

        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>

      <Skeleton className="h-[60vh] min-h-[320px] w-full rounded-lg md:h-[480px]" />
    </div>
  </div>
);

export { RouteDetailSkeleton };
