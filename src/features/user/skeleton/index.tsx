import { Skeleton } from "@/components/ui/skeleton";

import type { AdminScope } from "../lib/scope";

interface ListSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  scope: AdminScope;
  /**
   * Whether the toolbar carries the company selector. Defaults to the scope;
   * /admin/master-users is an admin page without one.
   */
  selector?: boolean;
  /** How many buttons the toolbar carries (Atualizar, Criar…). */
  actions?: number;
  /** Stat cards above the table; 0 when the screen has none. */
  cards?: number;
  /** Filter buttons beside the search box. */
  filters?: number;
  /** Columns drawn in the table's placeholder. */
  columns?: number;
}

/**
 * What an admin-users screen looks like before it has anything to show: the
 * toolbar band (selector on /admin, then the actions), the cards, the table
 * toolbar with its filters and the table — the same composition as the
 * content, so nothing jumps when the data lands.
 *
 * Hook-free and not a client component: `loading.tsx` renders it on the
 * server.
 */
const ListSkeleton = ({
  scope,
  selector = scope === "admin",
  actions = 2,
  cards = 0,
  filters = 0,
  columns = 6,
}: ListSkeletonProps): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    <div className="flex w-full flex-wrap items-center gap-3">
      {selector && <Skeleton className="h-10 w-full sm:w-[300px]" />}

      <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
        {Array.from({ length: actions }).map((_, index) => (
          <Skeleton
            key={index}
            // The page actions are h-9 everywhere (decision 16.61).
            className="h-9 w-full sm:w-[130px]"
          />
        ))}
      </div>
    </div>

    {cards > 0 && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-[142px] rounded-lg" />
        ))}
      </div>
    )}

    <div className="flex w-full flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-full sm:w-[270px]" />

      {Array.from({ length: filters }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-28" />
      ))}

      <Skeleton className="h-8 w-full sm:ml-auto sm:w-28" />
    </div>

    <div className="rounded-md border">
      <div className="flex items-center gap-4 border-b px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-5 flex-1" />
        ))}
      </div>

      <div className="divide-y">
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((_, column) => (
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

export { ListSkeleton };
