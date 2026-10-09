import { Skeleton } from "@/components/ui/skeleton";

import type { DriverScope } from "../lib/driver-rules";

interface DriverSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: DriverScope;
}

/**
 * What the driver screen looks like before it has anything to show: the
 * toolbar band (selector on /admin; Exportar, Atualizar and Criar), four
 * cards, the table toolbar with its four filters and the table — the same
 * composition, so nothing jumps when the data lands.
 *
 * Hook-free and not a client component: `loading.tsx` renders it on the
 * server.
 */
const DriverSkeleton = ({ mode }: DriverSkeletonProps): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    <div className="flex w-full flex-wrap items-center gap-3">
      {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

      <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-full sm:w-[130px]" />
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

      {Array.from({ length: 4 }).map((_, index) => (
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
                // Ragged but derived from the cell: random widths would differ
                // between the server render and the client's.
                style={{ maxWidth: `${62 + ((row * 7 + column * 13) % 38)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export { DriverSkeleton };
