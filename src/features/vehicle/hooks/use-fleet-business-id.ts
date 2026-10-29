"use client";

import { useSearchParams } from "next/navigation";

import { readBusinessIdParam } from "@/lib/business-id-param";
import { useAuthStore } from "@/store/auth-store";

/**
 * Which company a fleet screen acts on: the MASTER picks it in the /admin
 * selector (URL), everyone else is pinned to their session's (decision 8.7:
 * the scope is the only thing that differs between /admin and /dashboard).
 * Shared by the vehicle, vehicle-type and checklist screens.
 */
function useFleetBusinessId(): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  // Only a company id from the URL: it becomes a segment of API paths.
  return (
    readBusinessIdParam(searchParams.get("businessId")) ||
    sessionBusinessId ||
    undefined
  );
}

export { useFleetBusinessId };
