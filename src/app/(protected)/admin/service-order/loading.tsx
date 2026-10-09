import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

/** The heading is known before anything is fetched, so it is printed. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Ordens de serviço"
      description="Escolha a empresa acima para acompanhar as ordens de serviço da frota dela."
    />

    <MaintenanceListSkeleton mode="admin" actions={3} filters={3} />
  </PageContainer>
);

export default Loading;
