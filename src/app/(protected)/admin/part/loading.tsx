import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

/** The heading is known before anything is fetched, so it is printed. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Peças"
      description="Escolha a empresa acima para ver e manter o catálogo de peças dela."
    />

    <MaintenanceListSkeleton mode="admin" actions={2} filters={1} />
  </PageContainer>
);

export default Loading;
