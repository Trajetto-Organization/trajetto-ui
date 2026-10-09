import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Orçamentos looks like before the data lands: Atualizar on the action line,
 * four cards, the toolbar with its two filters and the table — the page's
 * own shape, so nothing jumps when it arrives.
 *
 * Hook-free and not a client component: `loading.tsx` renders it on the
 * server.
 */
const QuoteListSkeleton = (): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    {/* PageActions: stacked at full width on a phone, one row from sm. */}
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
      {/* Atualizar only: quotes arrive from the public site. */}
      <Skeleton className="h-8 w-full sm:w-[140px]" />
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[142px] rounded-lg" />
      ))}
    </div>

    <div className="flex w-full flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-full sm:w-[270px]" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-8 w-28" />
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
              // Ragged but deterministic: a random width would differ
              // between the server and the client render.
              <Skeleton
                key={column}
                className="h-4 flex-1"
                style={{ maxWidth: `${60 + ((row * 7 + column * 13) % 40)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>

    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  </div>
);

export { QuoteListSkeleton };
