"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Which company the integration screens act on.
 *
 * The master picks one through the selector on /admin (URL); on /dashboard the
 * company is the session's, whatever the address bar says. It matters more
 * here than on a list screen: issuing a key and pointing a webhook both take
 * the company in the PATH. A `?businessId=` of another company on /dashboard
 * used to win over the session, so the API's tenant refusal read as "your
 * profile lacks Integrações" and "Nova chave" aimed at the foreign id.
 */
function useIntegrationsBusinessId(
  mode: "admin" | "dashboard",
): string | undefined {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  if (mode === "dashboard") return storeBusinessId || undefined;

  // Only a company id from the URL: a crafted link must not choose which path
  // the viewer's session issues a key or points a webhook at.
  return readBusinessIdParam(searchParams.get("businessId"));
}

export { useIntegrationsBusinessId };
