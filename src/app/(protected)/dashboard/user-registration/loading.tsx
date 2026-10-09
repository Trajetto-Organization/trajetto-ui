import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ListSkeleton } from "@/features/user/skeleton";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition: toolbar, four cards, four filters, table.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Cadastro de usuário"
      description="Gerencie os usuários da sua empresa: nível de acesso, perfil ou motorista vinculado e situação do acesso."
    />

    <ListSkeleton scope="dashboard" cards={4} filters={4} />
  </PageContainer>
);

export default Loading;
