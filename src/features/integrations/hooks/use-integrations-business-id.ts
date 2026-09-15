"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Which company the integration screens act on.
 *
 * The master picks one through the selector (URL); everyone else is pinned to
 * their own session. It matters more here than on a list screen: issuing a key
 * and pointing a webhook both take the company in the PATH, and a blank
 * segment is a 404 rather than a refusal somebody can read.
 */
function useIntegrationsBusinessId(): string | undefined {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  return searchParams.get("businessId") || storeBusinessId || undefined;
}

export { useIntegrationsBusinessId };
