"use client";

import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

import { resolveFineBusinessId } from "../lib/scope";
import type { FineScreenMode } from "../lib/types";

/** The company the fines screen works on (see resolveFineBusinessId). */
function useFineBusinessId(mode: FineScreenMode): string | undefined {
  const searchParams = useSearchParams();
  const sessionBusinessId = useAuthStore((state) => state.businessId);

  return resolveFineBusinessId(
    mode,
    searchParams.get("businessId"),
    sessionBusinessId,
  );
}

export { useFineBusinessId };
