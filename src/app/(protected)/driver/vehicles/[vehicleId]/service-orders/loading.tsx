import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Back Button Skeleton */}
      <div data-tutorial="loading" className="mb-6">
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Heading Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-8 w-80 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Search Command Skeleton */}
      <div className="border rounded-md p-4 mb-6">
        <Skeleton className="h-10 w-full mb-4" />

        {/* Service Order Cards Grid Skeleton */}
        <div
          className="grid grid-cols-1 
          md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <div className="space-y-3">
                {/* Date and Badge */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>

                {/* Responsible User */}
                <div>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>

                {/* Amount and Parts */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-3 w-12 mb-1 ml-auto" />
                    <Skeleton className="h-5 w-8 ml-auto" />
                  </div>
                </div>

                {/* Branch and Supplier */}
                <div className="pt-3 border-t">
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
