"use client";

import { useSearchParams } from "next/navigation";

import { hasSelectedBusiness } from "../lib/scope";

import { SupplierSkeleton } from ".";

/**
 * /admin's loading shape, chosen by the URL being navigated to: loading.tsx
 * receives no search params, and without a company the page is only the
 * selector and the "Selecione uma empresa" box.
 */
const SupplierAdminLoading = (): JSX.Element => {
  const searchParams = useSearchParams();

  return (
    <SupplierSkeleton
      mode="admin"
      hasBusiness={hasSelectedBusiness(searchParams.get("businessId"))}
    />
  );
};

export { SupplierAdminLoading };
