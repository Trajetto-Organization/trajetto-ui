import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition: toolbar, cards, search and table.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Perfil de acesso"
      description="Gerencie os perfis de acesso da sua empresa: quem usa cada perfil e quais permissões ele concede."
    />

    <CatalogListSkeleton mode="dashboard" columns={7} />
  </PageContainer>
);

export default Loading;
