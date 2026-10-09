import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "../../layout/protected-page-container";

const ProtectedTablePageLoading = (): JSX.Element => {
  return (
    <PageContainer>
      <div data-tutorial="loading" className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div
        className="flex flex-col sm:flex-row items-start
        sm:items-center justify-between gap-4 w-full"
      >
        <div
          className="flex flex-wrap 
          flex-1 items-center gap-2 w-full"
        >
          <Skeleton className="h-8 w-56" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-36" />
          ))}

          <Skeleton className="h-8 w-28" />
          <div
            className="ml-auto flex flex-col 
            sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto"
          >
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </div>

      <div className="rounded-md border mt-4">
        <div className="flex items-center border-b px-4 py-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-32 mx-2" />
          ))}
        </div>

        <div className="space-y-2 p-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex items-center border-b 
              px-4 py-3 last:border-none"
            >
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-5 w-32 mx-2" />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col items-center 
        justify-between gap-4 px-2 sm:flex-row sm:gap-0 mt-4"
      >
        <Skeleton className="h-5 w-56" />

        <div
          className="flex flex-col w-full items-center 
          gap-4 sm:w-auto sm:flex-row sm:gap-6 lg:gap-8"
        >
          <div
            className="flex items-center 
            justify-between space-x-2 w-full sm:w-auto"
          >
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-16" />
          </div>

          <div
            className="flex flex-wrap items-center 
            justify-center gap-2 sm:justify-start sm:flex-nowrap"
          >
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}

            <Skeleton className="h-8 w-24" />

            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-8" />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProtectedTablePageLoading;
