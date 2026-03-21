import { Skeleton } from "@/components/ui/skeleton";
import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div
          className="w-full sm:max-w-md 
          flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div
          className="w-full sm:w-auto gap-2
          sm:ml-auto flex justify-end"
        >
          <Skeleton className="h-10 w-full sm:w-36" />
          <Skeleton className="h-10 w-full sm:w-36" />
        </div>
      </div>

      <div className="mb-4">
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="h-[calc(100vh-20rem)] overflow-hidden">
        <div className="flex gap-4 p-6 h-full">
          {Array.from({ length: 4 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="min-w-[300px] max-w-[300px] 
              bg-muted/30 rounded-lg"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-8 rounded-full" />{" "}
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>

                <div className="space-y-3">
                  {Array.from({
                    length: Math.floor(Math.random() * 4) + 2,
                  }).map((_, cardIndex) => (
                    <div
                      key={cardIndex}
                      className="p-3 bg-card border rounded-md"
                    >
                      <div
                        className="flex items-start 
                        justify-between gap-2 mb-2"
                      >
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-4" />
                      </div>

                      <div className="space-y-1 mb-3">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16 rounded-full" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </div>
          ))}

          <div
            className="min-w-[300px] flex 
            items-center justify-center"
          >
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
