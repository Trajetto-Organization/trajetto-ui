import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

/** The heading is known before anything is fetched, so it is printed. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Peças das ordens de serviço"
      description="Lance as peças usadas em cada ordem de serviço e acompanhe quanto elas somam."
    />

    <MaintenanceListSkeleton mode="dashboard" actions={2} filters={1} />
  </PageContainer>
);

export default Loading;
