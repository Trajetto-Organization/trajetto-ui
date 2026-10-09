import { Skeleton } from "@/components/ui/skeleton";

/**
 * What a fleet list screen looks like before it has anything to show: the
 * band (selector on /admin, then the action buttons), four cards, the toolbar
 * and the table. Shared by vehicles, vehicle types (no cards) and checklists.
 *
 * Hook-free and not a client component: `loading.tsx` renders it on the
 * server.
 */
interface FleetListSkeletonProps {
  mode: "admin" | "dashboard";
  /** How many buttons sit in the band (Exportar, Atualizar, Novo…). */
  actions?: number;
  /** Whether the screen has the four cards. */
  withStats?: boolean;
}

const WIDTHS = ["sm:w-[150px]", "sm:w-[150px]", "sm:w-[140px]"];

const FleetListSkeleton = ({
  mode,
  actions = 3,
  withStats = true,
}: FleetListSkeletonProps): JSX.Element => {
  const buttonHeight = "h-9";

  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton
              key={index}
              className={`w-full ${buttonHeight} ${WIDTHS[index % WIDTHS.length]}`}
            />
          ))}
        </div>
      </div>

      {withStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[142px] rounded-lg" />
          ))}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full sm:w-[270px]" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
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
                // Ragged but deterministic: Math.random() here would differ
                // between the server and the client render.
                <Skeleton
                  key={column}
                  className="h-4 flex-1"
                  style={{
                    maxWidth: `${60 + ((row * 7 + column * 13) % 40)}%`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-56" />
      </div>
    </div>
  );
};

export { FleetListSkeleton };
