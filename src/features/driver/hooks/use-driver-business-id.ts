"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { scopedDriverBusinessId, type DriverScope } from "../lib/driver-rules";

/**
 * The company the driver screen acts on: the selector's (`?businessId=`) on
 * /admin, the session's on /dashboard. The /admin forms used to ask for a
 * company inside the dialog, apart from the one the page was showing.
 */
function useDriverBusinessId(scope: DriverScope): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  return scopedDriverBusinessId(
    scope,
    searchParams.get("businessId"),
    sessionBusinessId,
  );
}

export { useDriverBusinessId };
