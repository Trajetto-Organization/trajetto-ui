"use client";

import { useSearchParams } from "next/navigation";

import { readBusinessIdParam } from "@/lib/business-id-param";

import { CatalogListSkeleton, type CatalogListSkeletonProps } from ".";

/**
 * The /admin skeleton for `loading.tsx`, which gets no searchParams: it reads
 * the URL it stands in for. Without a company the page is the selector over
 * "Selecione uma empresa"; with one, the cards and the list.
 */
const CatalogAdminLoading = (
  props: Omit<CatalogListSkeletonProps, "mode" | "hasCompany">,
): JSX.Element => {
  const searchParams = useSearchParams();

  return (
    <CatalogListSkeleton
      {...props}
      mode="admin"
      hasCompany={Boolean(readBusinessIdParam(searchParams.get("businessId")))}
    />
  );
};

export { CatalogAdminLoading };
