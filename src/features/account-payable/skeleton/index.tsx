import { Skeleton } from "@/components/ui/skeleton";

import type { FinanceScope } from "@/features/supplier/lib/scope";

interface AccountPayableSkeletonProps {
  /** "admin" has the company selector at the start of the band. */
  mode: FinanceScope;
  /**
   * Whether /admin has a company picked. Without one the page is only the
   * selector and the "Selecione uma empresa" box; drawing actions, cards and
   * a table there made the layout jump when it landed.
   */
  hasBusiness?: boolean;
}

const COLUMNS = 8;

/**
 * Contas a pagar before its data lands: the band (selector on /admin, then
 * Exportar, Atualizar and Criar), four cards, the toolbar with the Situação
 * and Categoria filters, the table and the pager — the shape the page lands
 * in. Its own, like every feature's: it used to borrow Fornecedores'.
 *
 * Hook-free and not a client component: `loading.tsx` and the page's
 * Suspense fallback render it on the server.
 */
const AccountPayableSkeleton = ({
  mode,
  hasBusiness = true,
}: AccountPayableSkeletonProps): JSX.Element => {
  if (mode === "admin" && !hasBusiness) {
    return (
      <div data-tutorial="loading" className="my-6 space-y-6">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-full sm:w-[300px]" />
        </div>

        {/* SelectBusinessEmptyState: EmptyState's panel (min-h-64). */}
        <Skeleton className="min-h-64 w-full rounded-lg" />
      </div>
    );
  }

  const actionHeight = "h-9";

  return (
    <div data-tutorial="loading" className="my-6 space-y-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        {/* PageActions: stacked at full width on a phone, one row from sm. */}
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className={`w-full sm:w-[140px] ${actionHeight}`}
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
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-full sm:ml-auto sm:w-28" />
      </div>

      <div className="rounded-md border">
        <div className="flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: COLUMNS }).map((_, index) => (
            <Skeleton key={index} className="h-5 flex-1" />
          ))}
        </div>

        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4 px-4 py-4">
              {Array.from({ length: COLUMNS }).map((_, column) => (
                // Ragged but derived from the cell: Math.random() would
                // differ between the server and the client render.
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

export { AccountPayableSkeleton };
