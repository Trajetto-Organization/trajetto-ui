import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Pausas dos motoristas looks like before it has anything to show: the
 * band (the selector on /admin, Atualizar), four cards, the two filters with
 * the period and Visualizar on their line, the table, the pager and the note
 * on how it is counted.
 *
 * Hook-free and not a client component: `loading.tsx` renders it on the
 * server.
 */
interface DriverPausesSkeletonProps {
  mode: "admin" | "dashboard";
}

const DriverPausesSkeleton = ({
  mode,
}: DriverPausesSkeletonProps): JSX.Element => {
  const buttonHeight = "h-9";

  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          <Skeleton className={`w-full sm:w-[160px] ${buttonHeight}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[142px] rounded-lg" />
        ))}
      </div>

      {/* The toolbar: the two filters, then the period and Visualizar as
          one group at the right (DataTableToolbarEnd). */}
      <div className="flex w-full flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />

        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <div data-skeleton-period className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            {/* "22/10/2026 a 28/10/2026", measured at 205px. */}
            <Skeleton className="h-8 w-[205px]" />
          </div>
          <Skeleton className="h-8 w-full sm:w-28" />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-5 flex-1" />
          ))}
        </div>

        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex items-start gap-4 px-4 py-4">
              {Array.from({ length: 7 }).map((_, column) => (
                <div key={column} className="flex-1 space-y-2">
                  <Skeleton
                    className="h-4"
                    style={{
                      maxWidth: `${60 + ((row * 7 + column * 13) % 40)}%`,
                    }}
                  />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 px-2 sm:flex-row">
        <Skeleton className="h-5 w-56" />

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-6">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-md" />
    </div>
  );
};

export { DriverPausesSkeleton };
