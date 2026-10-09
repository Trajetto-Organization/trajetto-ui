import { Skeleton } from "@/components/ui/skeleton";

/**
 * Stands where a photo drop zone renders while its chunk loads. The drop zones
 * (react-dropzone, ~15 KB gzipped) are loaded with the dialog that shows
 * them, not with the list page behind it.
 */
const PhotoFieldLoading = (): JSX.Element => (
  <div aria-busy="true" className="mb-4 space-y-2">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-[136px] w-full rounded-lg" />
  </div>
);

export { PhotoFieldLoading };
