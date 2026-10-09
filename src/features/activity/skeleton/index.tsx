import { Skeleton } from "@/components/ui/skeleton";

/**
 * The activity screen before the data lands: the action line, the view and
 * period switches, four cards and the timeline — the page's own shape, so
 * nothing jumps when it arrives. Hook-free: `loading.tsx` renders it on the
 * server.
 */
const ActivitySkeleton = (): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    <div className="flex w-full justify-end">
      <Skeleton className="h-8 w-full sm:w-[140px]" />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-10 w-full sm:w-[240px]" />
      <Skeleton className="h-8 w-[180px]" />
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
