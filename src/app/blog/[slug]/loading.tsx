"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";

const Loading = (): JSX.Element => {
  return (
    <div className="py-14">
      <Card className="max-w-4xl mx-auto overflow-hidden">
        {/* Hero Image Skeleton */}
        <div className="aspect-video relative overflow-hidden">
          <Skeleton className="w-full h-full" />
        </div>

        {/* Content */}
        <div className="px-8 pb-7 mt-5">
          {/* Article Header */}
          <div className="mt-3">
            {/* Category */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="w-24 h-4" />
            </div>

            {/* Title */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-4">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-2 h-2 rounded-full" />
              <Skeleton className="w-20 h-4" />
            </div>
          </div>

          <Separator className="my-8" />

          {/* Article Content Skeleton */}
          <div className="space-y-4">
            {/* Paragraphs */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Heading */}
            <Skeleton className="h-8 w-2/3 mt-8 mb-4" />

            {/* More paragraphs */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
            </div>

            {/* Another heading */}
            <Skeleton className="h-8 w-1/2 mt-8 mb-4" />

            {/* List items */}
            <div className="pl-6 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          </div>

          {/* Tags Skeleton */}
          <Separator className="my-8" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>

          <Separator className="my-8" />

          {/* Author Bio Skeleton */}
          <div className="bg-muted/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />

              <div className="flex-1">
                {/* Name */}
                <Skeleton className="h-6 w-32 mb-2" />

                {/* Bio */}
                <div className="space-y-1 mb-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </div>

                {/* Social Links */}
                <div className="flex gap-2">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <Skeleton className="w-9 h-9 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation and Share Skeleton */}
          <div className="mt-8 space-y-4">
            {/* Share buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
              <Skeleton className="w-9 h-9 rounded-lg" />
            </div>

            {/* Navigation button */}
            <div className="flex justify-center">
              <Skeleton className="w-36 h-10 rounded-full" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Loading;
