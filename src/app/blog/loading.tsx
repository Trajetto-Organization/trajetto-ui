"use client";

import { Skeleton } from "@/components/ui/skeleton";

const POSTS_PLACEHOLDER = Array.from({ length: 12 }, (_, i) => i);

const Loading = (): JSX.Element => {
  return (
    <div className="animate-pulse space-y-8">
      {/* Title & Subtitle Skeleton */}
      <div className="max-w-3xl mx-auto py-12 lg:py-24 text-center">
        <Skeleton className="h-12 w-2/5 mx-auto mb-4" />
        <Skeleton className="h-6 w-3/5 mx-auto" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="h-12 rounded-2xl bg-muted-foreground/20" />
      </div>

      {/* Filters Skeleton (badges) */}
      <div className="max-w-4xl mx-auto px-4 space-y-4">
        <div className="flex space-x-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>

      {/* Posts Grid Skeleton */}
      <div
        className="grid md:grid-cols-3 gap-8 
        mb-16 mt-8 px-4 max-w-6xl mx-auto"
      >
        {POSTS_PLACEHOLDER.map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>

      {/* Separator */}
      <div
        className="h-px bg-border my-16 
        max-w-6xl mx-auto"
      />

      {/* Newsletter Skeleton */}
      <div
        className="max-w-2xl mx-auto p-8 rounded-2xl 
        bg-muted-foreground/20 space-y-6"
      >
        <Skeleton className="h-16 w-16 mx-auto rounded-full" />
        <Skeleton className="h-8 w-3/5 mx-auto" />
        <Skeleton className="h-4 w-4/5 mx-auto" />
        <div className="flex justify-center space-x-4">
          <Skeleton className="h-12 w-2/5 rounded-xl" />
          <Skeleton className="h-12 w-2/5 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-2/3 mx-auto" />
      </div>
    </div>
  );
};

export default Loading;
