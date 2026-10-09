import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { FineSkeleton } from "@/features/fine/skeleton";

/**
 * What a navigation to Multas shows while the server answers: the real
 * title and the screen's own shape (three actions,
 * four cards, the table) instead of the generic stats skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Multas"
      description="Gerencie as multas cadastradas, delete, edite e mantenha os dados sempre atualizados."
    />

    <FineSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
