import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Abastecimentos looks like before it has anything to show, shaped like
 * the page it stands in for: the band (company selector on /admin, then
 * Exportar, Atualizar and Criar), four cards, the toolbar with the search and
 * three filters, the table and the pager — so nothing jumps when the data
 * lands. The Suspense fallback in page.tsx renders it (on /admin with
 * `hasCompany` read from searchParams).
 *
 * Hook-free and not a client component, so a server file can render it.
 * The /admin `loading.tsx` gets no searchParams, so it goes through the
 * client AdminListLoading (./admin-loading.tsx), which reads the URL and
 * renders this; the /dashboard `loading.tsx` renders it directly.
 */
interface ListSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: "admin" | "dashboard";
  /** Buttons on the selector's line (Exportar, Atualizar, Criar…). */
  actions?: number;
  /** Stat cards above the table; 0 for a list without cards. */
  cards?: number;
  /** Filter buttons beside the search. */
  filters?: number;
  /**
   * On /admin, whether the URL names a company. Without one the page is
   * only the selector over "Selecione uma empresa", and drawing buttons,
   * cards and a table there made the layout jump on first entry.
   */
  hasCompany?: boolean;
}

/**
 * /admin before a company is picked: the selector alone on the band, then
 * the dashed "Selecione uma empresa" panel (SelectBusinessEmptyState's box).
 */
const SelectBusinessSkeleton = (): JSX.Element => (
  <div
    data-tutorial="loading"
    className="my-6 space-y-6"
    data-skeleton="select-business"
  >
    <div className="flex w-full flex-wrap items-center gap-3">
      <Skeleton className="h-10 w-full sm:w-[300px]" />
    </div>

    <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-16">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  </div>
);

const ListSkeleton = ({
  mode,
  actions = 3,
  cards = 4,
  filters = 3,
  hasCompany = true,
}: ListSkeletonProps): JSX.Element => {
  if (mode === "admin" && !hasCompany) return <SelectBusinessSkeleton />;

  // The page actions are h-9 on /admin and /dashboard (decision 16.61).
  const buttonHeight = "h-9";

  return (
    <div
      data-tutorial="loading"
      className="my-6 space-y-6"
      data-skeleton="list"
    >
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton
              key={index}
              className={`${buttonHeight} w-full sm:w-[140px]`}
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
                    // Ragged but deterministic: random widths would differ
                    // between server and client (a hydration mismatch).
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

const FuelSkeleton = ({
  mode,
  hasCompany,
}: {
  mode: "admin" | "dashboard";
  hasCompany?: boolean;
}): JSX.Element => (
  <ListSkeleton
    mode={mode}
    actions={3}
    cards={4}
    filters={3}
    hasCompany={hasCompany}
  />
);

export {
  FuelSkeleton,
  ListSkeleton,
  SelectBusinessSkeleton,
  type ListSkeletonProps,
};
