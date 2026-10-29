"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { readBusinessIdParam } from "@/lib/business-id-param";

/**
 * Which company the route screens are looking at: the master picks one through
 * the selector (URL), everyone else is pinned to their own session.
 */
function useRoutesBusinessId(): string | undefined {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  // Only a company id from the URL: it becomes a segment of API paths.
  return (
    readBusinessIdParam(searchParams.get("businessId")) ||
    storeBusinessId ||
    undefined
  );
}

export { useRoutesBusinessId };
