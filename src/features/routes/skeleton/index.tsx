import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Rotas looks like before it has anything to show.
 *
 * Both places that wait on this page used the generic table skeleton: a
 * toolbar, a header row and ten rows. The page it stands in for has a company
 * selector, two actions and four cards above any of that — so the layout
 * changed shape the moment the data landed, every time.
 *
 * Entregas already has its own for the same reason; this is the same
 * composition with Rotas' own two buttons instead of four.
 *
 * Hook-free and not a client component on purpose: `loading.tsx` is rendered
 * on the server and handed to the client boundary as a prop, which is how a
 * `useRef` inside the table primitive once took the whole back office down.
 */
interface RoutesSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: "admin" | "dashboard";
}

const RoutesSkeleton = ({ mode }: RoutesSkeletonProps): JSX.Element => {
  return (
    <div className="my-6 space-y-6">
      {/* The band: context and actions on one line. Rotas has no sections, so
          unlike Entregas there is no rail under them. */}
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Skeleton className="h-9 w-9 shrink-0 sm:h-8 sm:w-[160px]" />
          <Skeleton className="h-9 min-w-0 flex-1 sm:h-8 sm:w-[120px] sm:flex-initial" />
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
                      Ragged, but derived from the cell rather than drawn at
                      random: `Math.random()` in a render gives the server one
                      number and the client another, which React calls a
                      hydration mismatch and answers by throwing the server's
                      markup away.
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
    </div>
  );
};

export { RoutesSkeleton };
