import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const KanbanBoardSkeleton = () => {
  return (
    <div className="h-[calc(100vh-20rem)] overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex gap-4 p-6 h-full">
          {Array.from({ length: 4 }).map((_, columnIndex) => (
            <div
              key={columnIndex}
              className="min-w-[300px] max-w-[300px]
              bg-muted/30 rounded-lg"
            >
              <div className="p-4">
                <div
                  className="flex items-center
                  justify-between mb-4"
                >
                  <div
                    className="flex flex-1
                    items-center gap-2"
                  >
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-8 rounded-full" />
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

                      <div
                        className="flex items-center
                        justify-between"
                      >
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export { KanbanBoardSkeleton };
