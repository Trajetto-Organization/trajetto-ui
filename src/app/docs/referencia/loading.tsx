import { Skeleton } from "@/components/ui/skeleton";

/** The reference while the API's document arrives: header, a tag, endpoints. */
const ReferenceLoading = () => (
  <div
    className="flex gap-10 [&_.animate-pulse]:bg-site-soft2"
    aria-busy="true"
    aria-label="Carregando a referência"
  >
    <div className="min-w-0 flex-1 py-10 min-[960px]:pl-10 xl:max-w-4xl">
      <div className="border-b border-site-line pb-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-9 w-2/3" />
        <Skeleton className="mt-4 h-5 w-full" />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-10 w-full sm:w-48" />
          <Skeleton className="h-10 w-full sm:w-48" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>

      <Skeleton className="mt-8 h-8 w-40" />
      {[0, 1].map((index) => (
        <div
          key={index}
          className="border-t border-site-line py-10 first:border-t-0"
        >
          <Skeleton className="h-7 w-1/2" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="mt-6 h-28 w-full rounded-xl" />
          <div className="mt-6 space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>

    <div className="hidden w-60 shrink-0 space-y-3 py-10 xl:block">
      <Skeleton className="h-3 w-24" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Skeleton key={index} className="h-3 w-40" />
      ))}
    </div>
  </div>
);

export default ReferenceLoading;
