"use client";

import { ErrorSurface } from "@/components/shared/error-surface";

/**
 * The boundary for everything outside the protected area.
 *
 * Next matches the closest `error.tsx` above the segment that threw, so this
 * one catches the marketing pages, the blog and anything else that is not
 * under `(protected)` — which has its own, with the app's chrome around it.
 */
const RootError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element => {
  return <ErrorSurface error={error} reset={reset} standalone />;
};

export default RootError;
