"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { scopedBusinessId, type AdminScope } from "../lib/scope";

/**
 * The company an admin-users screen acts on: the selector's (`?businessId=`)
 * on /admin, the session's on /dashboard. The /admin forms used to ask for a
 * company inside each dialog, apart from the one the page was showing.
 */
function useScopedBusinessId(scope: AdminScope): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  return scopedBusinessId(
    scope,
    searchParams.get("businessId"),
    sessionBusinessId,
  );
}

export { useScopedBusinessId };
