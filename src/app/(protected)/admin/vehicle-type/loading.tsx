import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { CatalogAdminLoading } from "@/components/shared/custom/catalog-list-skeleton/admin-loading";

/**
 * The same page, waiting: the title is known before anything is fetched, so
 * it is printed; the rest is the skeleton of what the URL will show.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Tipos de Veículo"
      description="Selecione uma empresa para ver e cadastrar os tipos de veículo dela."
    />

    <CatalogAdminLoading columns={6} />
  </PageContainer>
);

export default Loading;
