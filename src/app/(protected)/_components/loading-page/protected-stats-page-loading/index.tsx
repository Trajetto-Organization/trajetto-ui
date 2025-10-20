import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "../../layout/protected-page-container";

const ProtectedStatsPageLoading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Heading skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Action buttons skeleton */}
      <div
        className="flex flex-col sm:flex-row items-stretch 
        sm:items-center gap-3 sm:gap-2 justify-end mt-6 mb-6"
      >
        <Skeleton className="h-8 w-full sm:w-32" />
        <Skeleton className="h-8 w-full sm:w-32" />
      </div>

      {/* Stats cards skeleton - 4 cards grid */}
      <div
        className="grid gap-4 
        md:grid-cols-2 lg:grid-cols-4 mb-6"
      >
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-32 
            w-full rounded-lg"
          />
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div
        className="flex flex-wrap 
        items-center gap-2 w-full mb-4"
      >
        <Skeleton className="h-8 w-full sm:w-[270px]" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-32" />
        ))}
        <Skeleton className="h-8 w-24 ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        {/* Table header */}
        <div
          className="flex items-center 
          border-b px-4 py-2"
        >
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-32 mx-2" />
          ))}
        </div>

        {/* Table rows */}
        <div className="space-y-2 p-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="flex items-center 
              border-b px-4 py-3 last:border-none"
            >
              {[...Array(5)].map((_, j) => (
                <Skeleton key={j} className="h-5 w-32 mx-2" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination skeleton */}
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

export { ProtectedStatsPageLoading };
