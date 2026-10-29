import { Suspense } from "react";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { SupplierSkeleton } from "@/features/supplier/skeleton";
import { SupplierAdminLoading } from "@/features/supplier/skeleton/admin-loading";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed. The rest follows the URL: the list
 * with a company picked, the selector and the empty box without one.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Fornecedores"
      description="Selecione uma empresa para cadastrar e acompanhar os fornecedores dela."
    />

    {/* useSearchParams wants a boundary where the route could render
        statically; the list shape stands in meanwhile. */}
    <Suspense fallback={<SupplierSkeleton mode="admin" />}>
      <SupplierAdminLoading />
    </Suspense>
  </PageContainer>
);

export default Loading;
