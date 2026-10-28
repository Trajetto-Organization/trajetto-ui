"use client";

import { CaptchaSkeleton } from "@/components/shared/custom/captcha-turnstile/captcha-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const Loading = (): JSX.Element => {
  return (
    <>
      <div className="mb-7 grid gap-2 text-center">
        <div className="animate-fade-in [animation-delay:200ms]">
          <Skeleton className="h-9 w-48 mx-auto mb-2" />
        </div>

        <div className="animate-fade-left [animation-delay:300ms]">
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>
      </div>

      <section className="animate-fade-in [animation-delay:400ms]">
        <div className="space-y-4">
          <div className="grid gap-3 relative">
            <Skeleton className="h-4 w-12" />
            <div className="relative">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>

          <div className="grid gap-3 relative">
            <Skeleton className="h-4 w-12" />
            <div className="relative">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>

        <div className="mt-1">
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mt-6">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* The captcha's box as the forms draw it (production builds only),
            so the page replacing this fallback does not push the rest down. */}
        {process.env.NODE_ENV === "production" ? (
          <div className="mt-5">
            <CaptchaSkeleton size="flexible" />
          </div>
        ) : null}

        <div className="mt-5">
          <Skeleton className="h-px w-full" />
        </div>

        <div className="text-sm text-center p-5">
          <Skeleton className="h-3 w-full mx-auto mt-2" />
          <div className="flex justify-center gap-1 mt-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </section>
    </>
  );
};

export default Loading;
