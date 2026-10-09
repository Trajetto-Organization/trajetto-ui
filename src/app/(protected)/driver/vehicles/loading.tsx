import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Heading skeleton */}
      <div data-tutorial="loading" className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" />
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
                  {/* Header: Brand/Model and Status Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  {/* License Plate */}
                  <div className="mb-3">
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-5 w-24" />
                  </div>

                  {/* Mileage and Fuel */}
                  <div className="flex justify-between items-end mb-3">
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="space-y-1 text-right">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>

                  {/* Maintenance Info */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-between mb-3">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="space-y-1 text-right">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-3 border-t border-gray-100">
                    <Skeleton className="h-4 w-48 mx-auto" />
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
