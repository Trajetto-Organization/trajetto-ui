"use client";

import { useSearchParams } from "next/navigation";

import { hasSelectedBusiness } from "@/features/supplier/lib/scope";

import { AccountPayableSkeleton } from ".";

/**
 * /admin's loading shape, chosen by the URL being navigated to: loading.tsx
 * receives no search params, and without a company the page is only the
 * selector and the "Selecione uma empresa" box.
 */
const AccountPayableAdminLoading = (): JSX.Element => {
  const searchParams = useSearchParams();

  return (
    <AccountPayableSkeleton
      mode="admin"
      hasBusiness={hasSelectedBusiness(searchParams.get("businessId"))}
    />
  );
};

export { AccountPayableAdminLoading };
