"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { scopedBusinessId, type BranchScope } from "../lib/scope";

/**
 * The company the Filiais screen acts on: the selector's (`?businessId=`) on
 * /admin, the session's on /dashboard. Creating on /admin used to ask for
 * the company inside the dialog, apart from the one the page was showing.
 */
function useScopedBusinessId(scope: BranchScope): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  return scopedBusinessId(
    scope,
    searchParams.get("businessId"),
    sessionBusinessId,
  );
}

export { useScopedBusinessId };
