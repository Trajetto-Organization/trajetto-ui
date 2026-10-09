import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { AdminListLoading } from "@/features/fuel/skeleton/admin-loading";

/**
 * The page as it will be, before the server answers: the real heading (it is
 * known before anything is fetched) over the skeleton of what the URL will
 * show — the selector alone until a company is picked, the list after.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Abastecimento"
      description="Selecione uma empresa para ver, filtrar e corrigir os abastecimentos da frota dela."
    />

    <AdminListLoading actions={3} cards={4} filters={3} />
  </PageContainer>
);

export default Loading;
