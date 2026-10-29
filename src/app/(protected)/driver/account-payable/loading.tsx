import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

/**
 * The page's own shape: the back button, the heading (known before any
 * fetch, so printed), the search field and the bill cards.
 */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <div data-tutorial="loading" className="mb-6">
        <Skeleton className="h-10 w-28" />
      </div>

      <ProtectedHeading
        title="Minhas Contas a Pagar"
        description="As contas em que você é o responsável, com a situação de cada uma."
      />

      <div className="mt-7 space-y-6">
        {/* The search field and Atualizar. */}
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full sm:max-w-md" />
          <Skeleton className="h-10 w-full sm:ml-auto sm:w-28" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Card key={key} className="p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              <div className="mb-3 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((cell) => (
                  <div key={cell} className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                {[1, 2].map((cell) => (
                  <div key={cell} className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
