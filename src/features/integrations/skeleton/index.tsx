import { Skeleton } from "@/components/ui/skeleton";

/**
 * What Integrações looks like before it has anything to show.
 *
 * Both places that wait on this page used the generic table skeleton — a
 * search box, a header row and ten rows — for a page with a company selector,
 * a band of actions, a strip of four sections and a list of cards. A fallback
 * that does not match the thing it covers is a second layout the person has
 * to watch collapse.
 *
 * Server-safe and hook-free, like the deliveries skeleton: `loading.tsx` is
 * rendered on the server and handed to the client boundary as a prop.
 */
const IntegrationsSkeleton = ({
  mode,
}: {
  /** "admin" waits for a company to be chosen, so it has a selector. */
  mode: "admin" | "dashboard";
}): JSX.Element => (
  <div data-tutorial="loading" className="my-6 space-y-6">
    <div className="space-y-3">
      <div className="flex w-full flex-wrap items-center gap-3">
        {mode === "admin" && <Skeleton className="h-10 w-full sm:w-[300px]" />}

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
          <Skeleton className="h-9 w-full sm:w-[104px]" />
          <Skeleton className="h-9 w-full sm:w-[120px]" />
        </div>
      </div>

      {/* The section strip keeps its own width: four sections, not ten. */}
      <Skeleton className="h-10 w-full rounded-md sm:w-[560px]" />
    </div>

    <Skeleton className="h-4 w-full max-w-md" />

    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

export { IntegrationsSkeleton };
