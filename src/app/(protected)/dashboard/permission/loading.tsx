import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ListSkeleton } from "@/features/user/skeleton";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition: toolbar, three cards, four filters, table.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Permissão de usuário"
      description="Ajuste o que cada perfil de acesso da sua empresa pode consultar e alterar."
    />

    <ListSkeleton scope="dashboard" cards={3} filters={4} columns={8} />
  </PageContainer>
);

export default Loading;
