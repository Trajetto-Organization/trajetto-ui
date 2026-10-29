import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { CatalogAdminLoading } from "@/components/shared/custom/catalog-list-skeleton/admin-loading";

/**
 * The real heading over the skeleton of what the URL will show: the selector
 * alone until a company is picked, the cards and the list after.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Tipo de Combustível"
      description="Selecione uma empresa para ver e manter os combustíveis que a frota dela usa."
    />

    <CatalogAdminLoading columns={6} />
  </PageContainer>
);

export default Loading;
