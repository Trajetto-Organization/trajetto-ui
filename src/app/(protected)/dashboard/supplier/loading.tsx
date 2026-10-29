import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { SupplierSkeleton } from "@/features/supplier/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the list skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Fornecedores"
      description="Controle centralizado de parceiros comerciais. Cadastre, monitore e gerencie seus fornecedores."
    />

    <SupplierSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
