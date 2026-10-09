import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";

/**
 * The same page, waiting: the title is known before anything is fetched, so
 * it is printed; the rest is the list's own skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Tipos de Veículo"
      description="Cadastre os tipos de veículo da frota, com os eixos padrão e a categoria de CNH exigida."
    />

    <CatalogListSkeleton mode="dashboard" columns={6} />
  </PageContainer>
);

export default Loading;
