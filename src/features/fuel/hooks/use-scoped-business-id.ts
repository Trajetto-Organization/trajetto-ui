"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { scopedBusinessId, type FleetScope } from "../lib/scope";

/**
 * The company a fleet screen acts on: the selector's (`?businessId=`) on
 * /admin, the session's on /dashboard. Create and export on /admin used to
 * pick a company inside the dialog (or send none), apart from the one the
 * page was showing.
 */
function useScopedBusinessId(scope: FleetScope): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  return scopedBusinessId(
    scope,
    searchParams.get("businessId"),
    sessionBusinessId,
  );
}

export { useScopedBusinessId };
