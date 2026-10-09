"use client";

import { useSearchParams } from "next/navigation";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { ListSkeleton, type ListSkeletonProps } from ".";

/**
 * The /admin skeleton for `loading.tsx`, which gets no searchParams: it reads
 * the URL it is shown for. Without a company the page is the selector over
 * "Selecione uma empresa" (the way in from the sidebar); with one, the list.
 * The Suspense fallback in page.tsx decides the same from its searchParams.
 */
const AdminListLoading = (
  props: Omit<ListSkeletonProps, "mode" | "hasCompany">,
): JSX.Element => {
  const searchParams = useSearchParams();

  return (
    <ListSkeleton
      {...props}
      mode="admin"
      hasCompany={Boolean(readBusinessIdParam(searchParams.get("businessId")))}
    />
  );
};

export { AdminListLoading };
