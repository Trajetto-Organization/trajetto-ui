import { Skeleton } from "@/components/ui/skeleton";

import type { FineScreenMode } from "../lib/types";

interface FineSkeletonProps {
  /** "admin" has the company selector at the start of the band. */
  mode: FineScreenMode;
}

/**
 * What the fines screen looks like before it has anything to show: the
 * band (selector on /admin, then three actions), four cards, the toolbar
 * with three filters, the table and the pager — the shape the page lands
 * in, so nothing jumps when the data arrives.
 *
 * Hook-free and not a client component on purpose: `loading.tsx` renders it
 * on the server.
 */
const FineSkeleton = ({ mode }: FineSkeletonProps): JSX.Element => {
  const actionHeight = "h-9";

  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className={`${actionHeight} w-full sm:w-[130px]`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[142px] rounded-lg" />
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full sm:w-[270px]" />

        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-28" />
        ))}

        <Skeleton className="h-8 w-full sm:ml-auto sm:w-28" />
      </div>

      <div className="rounded-md border">
        <div className="flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-5 flex-1" />
          ))}
        </div>

        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 px-4 py-4">
              {Array.from({ length: 6 }).map((_, column) => (
                <Skeleton
                  key={column}
                  className="h-4 flex-1"
                  // Ragged but derived from the cell: Math.random() would
                  // differ between server and client (hydration mismatch).
                  style={{
                    maxWidth: `${62 + ((row * 7 + column * 13) % 38)}%`,
                  }}
                />
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
    </div>
  );
};

export { FineSkeleton };
