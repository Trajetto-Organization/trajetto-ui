import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

/** The heading is known before anything is fetched, so it is printed. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Ordens de serviço"
      description="Registre as manutenções da frota, acompanhe as abertas e mantenha a quilometragem dos veículos em dia."
    />

    <MaintenanceListSkeleton mode="dashboard" actions={3} filters={3} />
  </PageContainer>
);

export default Loading;
