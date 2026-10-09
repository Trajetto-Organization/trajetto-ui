import { Skeleton } from "@/components/ui/skeleton";

import type { FinanceScope } from "../lib/scope";

interface FinanceListSkeletonProps {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: FinanceScope;
  /**
   * Whether /admin has a company picked. Without one the page is only the
   * selector and the "Selecione uma empresa" box (see skeletonShape), and
   * drawing actions, cards and a table there made the layout jump.
   */
  hasBusiness?: boolean;
  /** Buttons on the actions line (Atualizar, Criar, Exportar…). */
  actions: number;
  /** Filter buttons beside the search. */
  filters: number;
  /** Table columns drawn. */
  columns?: number;
}

/** The selector at the start of the band on /admin, its height and width. */
const SelectorSkeleton = (): JSX.Element => (
  <Skeleton className="h-10 w-full sm:w-[300px]" />
);

/**
 * A list screen before its data lands: the selector (on /admin) and the
 * actions on one line, four cards, the toolbar and the table — the page's
 * own shape, so nothing jumps when it arrives. On /admin without a company,
 * the selector and the empty box the page will show instead.
 *
 * Hook-free and not a client component: `loading.tsx` and the page's
 * Suspense fallback render it on the server.
 */
const FinanceListSkeleton = ({
  mode,
  hasBusiness = true,
  actions,
  filters,
  columns = 6,
}: FinanceListSkeletonProps): JSX.Element => {
  if (mode === "admin" && !hasBusiness) {
    return (
      <div data-tutorial="loading" className="my-6 space-y-6">
        <div className="flex w-full flex-wrap items-center gap-3">
          <SelectorSkeleton />
        </div>

        {/* SelectBusinessEmptyState: EmptyState's panel (min-h-64). */}
        <Skeleton className="min-h-64 w-full rounded-lg" />
      </div>
    );
  }

  const buttonHeight = "h-9";

  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <SelectorSkeleton />}

        {/* PageActions: stacked at full width on a phone, one row from sm. */}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: actions }).map((_, index) => (
            <Skeleton
              key={index}
              className={`w-full sm:w-[140px] ${buttonHeight}`}
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
                // Ragged but deterministic: a random width would differ
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
};

/** Fornecedores: Atualizar and Criar; the UF filter. */
const SupplierSkeleton = ({
  mode,
  hasBusiness,
}: Pick<FinanceListSkeletonProps, "mode" | "hasBusiness">): JSX.Element => (
  <FinanceListSkeleton
    mode={mode}
    hasBusiness={hasBusiness}
    actions={2}
    filters={1}
  />
);

export { FinanceListSkeleton, SupplierSkeleton };
