"use client";

import { useRouter } from "next/navigation";

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
  const router = useRouter();

  /**
   * Refresh, then reset, and the order is the behaviour.
   *
   * `reset` alone re-renders from the RSC payload the client already holds,
   * which for a server-render failure is the failure itself — so the button
   * would be a button that does nothing, forever. `refresh` discards that
   * payload and asks the server again, which is what a person pressing "try
   * again" means by it.
   */
  const retry = (): void => {
    router.refresh();
    reset();
  };

  return (
    <ErrorSurface error={error} reset={reset} onRetry={retry} standalone />
  );
};

export default RootError;
