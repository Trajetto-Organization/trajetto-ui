import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { FineSkeleton } from "@/features/fine/skeleton";

/**
 * What a navigation to Multas shows while the server answers: the real
 * title and the screen's own shape (the company selector, three actions,
 * four cards, the table) instead of the generic stats skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Multas"
      description="Selecione uma empresa para consultar e gerenciar as multas dela."
    />

    <FineSkeleton mode="admin" />
  </PageContainer>
);

export default Loading;
