"use client";

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

/**
 * Which company the delivery screens are looking at: the master picks one
 * through the selector (URL), everyone else is pinned to their own session.
 */
function useDeliveriesBusinessId(): string | undefined {
  const searchParams = useSearchParams();
  const storeBusinessId = useAuthStore((state) => state.businessId);

  return searchParams.get("businessId") || storeBusinessId || undefined;
}

export { useDeliveriesBusinessId };
