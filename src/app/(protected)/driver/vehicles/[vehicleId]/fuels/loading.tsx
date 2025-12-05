import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Back Button Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-10 w-48" />
      </div>

      {/* Heading skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="space-y-6 mt-7">
        {/* Command Search skeleton */}
        <div className="border rounded-md">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Skeleton className="h-5 w-5 mr-2" />
            <Skeleton className="h-5 flex-1" />
          </div>

          {/* Cards Grid skeleton */}
          <div className="p-4">
            <div
              className="grid grid-cols-1 
              md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-4">
                  {/* Header: Date and Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  {/* Driver Info */}
                  <div className="mb-3">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>

                  {/* Amount and Price */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-3 w-12 ml-auto" />
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </div>
                  </div>

                  {/* Mileage and Price per Liter */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
