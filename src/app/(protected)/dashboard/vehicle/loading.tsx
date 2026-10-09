import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { FleetListSkeleton } from "@/features/vehicle/skeleton";

/**
 * The same page, waiting: the title is known before anything is fetched, so
 * it is printed; the rest is the list's own skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Veículos"
      description="Cadastre, edite e acompanhe os veículos da frota: status, quilometragem e motorista responsável."
    />

    <FleetListSkeleton mode="dashboard" actions={3} withStats />
  </PageContainer>
);

export default Loading;
