import { Suspense } from "react";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { AccountPayableSkeleton } from "@/features/account-payable/skeleton";
import { AccountPayableAdminLoading } from "@/features/account-payable/skeleton/admin-loading";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed. The rest follows the URL: the list
 * with a company picked, the selector and the empty box without one.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Contas a pagar"
      description="Selecione uma empresa para registrar e acompanhar as contas a pagar dela."
    />

    {/* useSearchParams wants a boundary where the route could render
        statically; the list shape stands in meanwhile. */}
    <Suspense fallback={<AccountPayableSkeleton mode="admin" />}>
      <AccountPayableAdminLoading />
    </Suspense>
  </PageContainer>
);

export default Loading;
