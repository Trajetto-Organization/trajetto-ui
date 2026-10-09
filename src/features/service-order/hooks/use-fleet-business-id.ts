"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";
import { readBusinessIdParam } from "@/lib/business-id-param";

import type { FleetScope } from "../lib/service-order-rules";

/**
 * Which company a maintenance screen acts on (decision 8.7).
 *
 * /admin: the one the master picked in the selector at the top (the URL);
 * /dashboard: the session's own. Each scope reads only its source, so a
 * `?businessId=` typed into a /dashboard URL never redirects its writes.
 */
function useFleetBusinessId(scope: FleetScope): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  if (scope === "admin") {
    // Only a company id: it becomes a segment of API paths.
    return readBusinessIdParam(searchParams.get("businessId"));
  }

  return sessionBusinessId || undefined;
}

export { useFleetBusinessId };
