import { Skeleton } from "@/components/ui/skeleton";

const ProtectedDriverPageLoading = (): JSX.Element => {
  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <header
        className="flex h-14 sm:h-14 shrink-0 px-4
        items-center justify-between gap-2 border-b"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo Skeleton */}
            <Skeleton
              className="h-6 sm:h-7 w-24 
              sm:w-28 flex-shrink-0 rounded-md"
            />

            {/* Search Bar Skeleton */}
            <div
              className="flex-1 max-w-md 
              mx-2 sm:mx-4 w-24 sm:w-28"
            >
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
        {/* Account Settings Skeleton */}
        <div className="w-44 sm:w-56 flex-shrink-0">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </header>
    </div>
  );
};

export { ProtectedDriverPageLoading };
