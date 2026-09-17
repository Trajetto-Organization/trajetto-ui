"use client";

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
  return (
    <ErrorSurface
      error={error}
      reset={reset}
      homeHref="/dashboard"
      homeLabel="Voltar ao painel"
    />
  );
};

export default ProtectedError;
