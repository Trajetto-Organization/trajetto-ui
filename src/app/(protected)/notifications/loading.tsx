import PageContainer from "../_components/layout/protected-page-container";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      {/* Header skeletons */}
      <div data-tutorial="loading" className="mb-8">
        <Skeleton className="h-8 w-52 mb-2" /> {/* Title */}
        <Skeleton className="h-4 w-72" /> {/* Description */}
      </div>

      <div className="space-y-4 my-9">
        {/* Top notification controls */}
        <div className="flex flex-wrap justify-between items-center gap-y-3">
          <div className="flex items-center gap-2 min-w-[140px]">
            <Skeleton className="h-5 w-5 rounded-full" /> {/* Bell icon */}
            <Skeleton className="h-4 w-48" /> {/* Notification count text */}
            <Skeleton className="h-7 w-20 rounded-full ml-2" />{" "}
            {/* Real-time button */}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" /> {/* Mark all as read button */}
            <Skeleton className="h-9 w-28" /> {/* Refresh button */}
          </div>
        </div>

        {/* Tabs */}
        <div>
          <Skeleton className="h-10 w-44 rounded-md" /> {/* Tabs list */}
        </div>

        {/* Notification cards */}
        <div className="space-y-4 mt-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Card header */}
                <div className="px-6 pt-6 pb-2">
                  <Skeleton className="h-6 w-3/4 mb-2" /> {/* Title */}
                  <Skeleton className="h-4 w-1/4" /> {/* Date */}
                </div>

                {/* Card content */}
                <div className="px-6 pb-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>

                {/* Card footer */}
                <div
                  className="px-6 pb-6 pt-0 flex 
                  flex-wrap justify-between gap-y-2"
                >
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-9 w-32" />{" "}
                    {/* View details button */}
                    <Skeleton className="h-9 w-40" />{" "}
                    {/* Mark as read button */}
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />{" "}
                  {/* Delete button */}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom filters */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-4 mt-6">
          <div
            className="flex items-center justify-between 
            sm:justify-start gap-2 w-full sm:w-auto"
          >
            <Skeleton className="h-4 w-12" /> {/* Status label */}
            <Skeleton className="h-8 w-[150px]" /> {/* Status dropdown */}
          </div>
          <div
            className="flex items-center justify-between 
            sm:justify-start gap-2 w-full sm:w-auto"
          >
            <Skeleton className="h-4 w-12" /> {/* Display label */}
            <Skeleton className="h-8 w-[110px]" /> {/* Display dropdown */}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Loading;
