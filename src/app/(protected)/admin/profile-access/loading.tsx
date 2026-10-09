import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { CatalogAdminLoading } from "@/components/shared/custom/catalog-list-skeleton/admin-loading";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition for the URL: the selector alone until a
 * company is picked, then the cards, the search and the table.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Perfil de acesso"
      description="Selecione uma empresa para gerenciar os perfis de acesso dela: quem usa cada perfil e quais permissões ele concede."
    />

    <CatalogAdminLoading columns={7} />
  </PageContainer>
);

export default Loading;
