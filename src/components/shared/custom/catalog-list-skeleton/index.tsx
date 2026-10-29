import { Skeleton } from "@/components/ui/skeleton";

import { SelectBusinessSkeleton } from "@/features/fuel/skeleton";

/**
 * Perfis de acesso, Tipos de veículo and Tipos de combustível before the
 * server answers, shaped like the page so nothing jumps when the data lands:
 * the band (company selector on /admin, then Atualizar and Criar), the three
 * cards in StatsGrid's three-column layout (one, then two from `sm`, three
 * from `lg`), the search with Visualizar, the table and the pager.
 *
 * Hook-free and not a client component: a server file can render it. The
 * /admin `loading.tsx` gets no searchParams and goes through the client
 * CatalogAdminLoading (./admin-loading.tsx), which reads the URL.
 */
interface CatalogListSkeletonProps {
  mode: "admin" | "dashboard";
  /** Buttons on the band (Atualizar, Criar…). */
  actions?: number;
  /** Columns drawn in the table placeholder. */
  columns?: number;
  /**
   * On /admin, whether the URL names a company. Without one the page is the
   * selector over "Selecione uma empresa": no cards, no table.
   */
  hasCompany?: boolean;
}

const CatalogListSkeleton = ({
  mode,
  actions = 2,
  columns = 5,
  hasCompany = true,
}: CatalogListSkeletonProps): JSX.Element => {
  if (mode === "admin" && !hasCompany) return <SelectBusinessSkeleton />;

  return (
    <div
      data-tutorial="loading"
      className="my-6 space-y-6"
      data-skeleton="catalog-list"
    >
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: actions }).map((_, index) => (
            // The page actions are h-9 on /admin and /dashboard (decision 16.61).
            <Skeleton key={index} className="h-9 w-full sm:w-[130px]" />
          ))}
        </div>
      </div>

      {/* The same grid StatsGrid uses for three cards, at a card's height. */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-skeleton="stats"
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[142px] rounded-lg" />
        ))}
      </div>

      <div className="flex w-full flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-full sm:w-[270px]" />
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
                  // Ragged but deterministic: random widths would differ
                  // between the server and the client render.
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

export { CatalogListSkeleton, type CatalogListSkeletonProps };
