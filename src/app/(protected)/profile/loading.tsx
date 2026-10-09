import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "../_components/layout/protected-page-container";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <div data-tutorial="loading" className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="divide-y divide-muted mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-x-10 gap-y-4 py-6 md:grid-cols-10">
          <div className="col-span-4 space-y-1.5">
            <h2 className="text-lg font-semibold leading-none">
              <Skeleton className="h-7 w-48" />
            </h2>
            <div className="text-balance text-sm text-muted-foreground">
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="col-span-6">
            <div className="flex w-full items-center gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-40 py-2" />
            </div>
            <div className="flex flex-col justify-between mt-1">
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>

        {Array.from([0, 1]).map((item) => (
          <div key={item} className="divide-y divide-muted mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-x-10 gap-y-4 py-6 md:grid-cols-10">
              <div className="col-span-4 space-y-1.5">
                <h2 className="text-lg font-semibold leading-none">
                  <Skeleton className="h-7 w-48" />
                </h2>
                <div className="text-balance text-sm text-muted-foreground">
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              <div className="col-span-6">
                <div className="flex w-full items-center gap-2 h-full">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default Loading;
