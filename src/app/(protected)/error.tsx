"use client";

import { useRouter } from "next/navigation";

import { ErrorSurface } from "@/components/shared/error-surface";

/**
 * The boundary for the whole dashboard.
 *
 * Placed inside `(protected)` rather than at the root so the sidebar, the
 * header and the company selector stay on screen: a render that threw on the
 * deliveries table must not take the navigation with it, because the way out
 * of a broken screen IS the navigation.
 *
 * "Ir para o início" points at the dashboard and not at the marketing home —
 * somebody who is signed in and working has no use for the landing page.
 */
const ProtectedError = ({
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
    <ErrorSurface
      error={error}
      reset={reset}
      onRetry={retry}
      homeHref="/dashboard"
      homeLabel="Voltar ao painel"
    />
  );
};

export default ProtectedError;
