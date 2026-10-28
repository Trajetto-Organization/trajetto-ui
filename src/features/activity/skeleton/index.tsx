import { Skeleton } from "@/components/ui/skeleton";

/**
 * The activity screen before the data lands: one line with the view switch
 * on the left and the period and Atualizar on the right (stacked on a
 * phone), four cards and the timeline — the page's own shape, so nothing
 * jumps when it arrives. Hook-free: `loading.tsx` renders it on the server.
 */
const ActivitySkeleton = (): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    <div className="flex w-full flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-full sm:w-[240px]" />

      <div
        data-skeleton-actions
        className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center"
      >
        {/* Widths measured on the live line (28/10/2026): the shortcuts
            165px with their icon, Atualizar 109px. */}
        <div data-skeleton-period className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-9 w-[141px]" />
        </div>
        <Skeleton className="h-9 w-full sm:w-[110px]" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[142px] rounded-lg" />
      ))}
    </div>

    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-lg border p-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export { ActivitySkeleton };
