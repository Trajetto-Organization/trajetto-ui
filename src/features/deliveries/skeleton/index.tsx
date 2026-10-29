import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Entregas looks like before it has anything to show.
 *
 * Both places that wait on this page used a generic table skeleton: a search
 * box, a header row and ten rows. The page it was standing in for has a
 * company selector, an action bar, a strip of six sections and four cards
 * ABOVE any of that — so every arrival jumped, and every tab change jumped
 * back. A fallback that does not match the thing it is covering is not a
 * loading state, it is a second layout the user has to watch collapse.
 *
 * Deliberately not a client component and deliberately hook-free: `loading.tsx`
 * is built on the server and handed to the client boundary as a rendered
 * prop, which is how a `useRef` inside the table primitive once took the whole
 * back office down. `tests/unitaires/server-client-boundary.test.ts` is what
 * keeps that true; this comment is so nobody has to rediscover why.
 */
interface DeliveriesSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: "admin" | "dashboard";

  /** Sections with no cards skip the row of four. */
  withStats?: boolean;
}

const DeliveriesSkeleton = ({
  mode,
  withStats = true,
}: DeliveriesSkeletonProps): JSX.Element => {
  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      {/* The band: context and actions on one line, sections under them. */}
      <div className="space-y-3">
        <div className="flex w-full flex-wrap items-center gap-3">
          {mode === "admin" && (
            <Skeleton className="h-10 w-full sm:w-[300px]" />
          )}

          {/* PageActions: Exportar, Importar, Atualizar and Nova entrega
              stacked at full width with their labels on a phone, one row
              from `sm`; h-9 like the live buttons (decision 16.61). */}
          <div
            data-skeleton-actions
            className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row"
          >
            {[
              "sm:w-[104px]",
              "sm:w-[110px]",
              "sm:w-[160px]",
              "sm:w-[138px]",
            ].map((width) => (
              <Skeleton key={width} className={`h-9 w-full ${width}`} />
            ))}
          </div>
        </div>

        {/* One bar, because the strip IS one bar with the sections inside. */}
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {withStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[142px] rounded-lg" />
          ))}
        </div>
      )}

      <DeliveriesTableSkeleton />
    </div>
  );
};

/**
 * The table part alone — its toolbar, the rows and the pagination — for the
 * moment a tab's table code is still on its way (table/index.tsx loads each
 * tab's table as its own chunk). Same shapes as the page skeleton above, so
 * the page around it does not move.
 */
const DeliveriesTableSkeleton = (): JSX.Element => (
  <>
    {/* The table's own toolbar: search, the filters, then the period and
          the view menu as one group at the right (DataTableToolbarEnd),
          moving to the next line together when they do not fit. */}
    <div className="flex w-full flex-wrap items-center gap-2">
      <Skeleton className="h-8 w-full sm:w-[270px]" />

      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-28" />
      ))}

      <div
        data-skeleton-toolbar-end
        className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto"
      >
        <div data-skeleton-period className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <div className="flex items-center gap-1">
            {/* Hoje, 7, 14 and 30 dias, Personalizado. Keyed by position:
                two presets share a width. */}
            {["w-14", "w-16", "w-[72px]", "w-[72px]", "w-28"].map(
              (width, index) => (
                <Skeleton key={index} className={`h-8 ${width}`} />
              ),
            )}
          </div>
        </div>

        <Skeleton className="h-8 w-full sm:w-28" />
      </div>
    </div>

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
                style={{
                  /*
                      Ragged on purpose, and derived from the cell rather than
                      drawn at random: `Math.random()` in a render gives the
                      server one number and the client another, which React
                      calls a hydration mismatch and answers by throwing the
                      server's markup away.
                    */
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
  </>
);

export { DeliveriesSkeleton, DeliveriesTableSkeleton };
