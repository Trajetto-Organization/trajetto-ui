import { useAuthStore } from "./auth-store";

/**
 * The session's company as a company screen on /dashboard needs it.
 *
 * The store is client state seeded after the first render (the layout's
 * setAuth): the server pass and the first client pass have no company yet.
 * Read as "no company", that drew "Selecione uma empresa" for a company
 * user until the seed arrived — for seconds under load, long enough for a
 * browser test to fail on it. `pending` tells that moment apart: show the
 * screen loading, and the empty state only once the session is known.
 */
interface SessionCompany {
  businessId: string | undefined;
  pending: boolean;
}

function sessionCompanyOf(state: {
  businessId: string | null;
  isLoaded: boolean;
}): SessionCompany {
  const businessId = state.businessId || undefined;

  return { businessId, pending: !businessId && !state.isLoaded };
}

function useSessionCompany(): SessionCompany {
  const businessId = useAuthStore((state) => state.businessId);
  const isLoaded = useAuthStore((state) => state.isLoaded);

  return sessionCompanyOf({ businessId, isLoaded });
}

export { sessionCompanyOf, useSessionCompany };
export type { SessionCompany };
