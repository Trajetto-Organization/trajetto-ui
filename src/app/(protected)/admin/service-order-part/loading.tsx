import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

/** The heading is known before anything is fetched, so it is printed. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Peças das ordens de serviço"
      description="Escolha a empresa acima para ver as peças lançadas nas ordens de serviço dela."
    />

    <MaintenanceListSkeleton mode="admin" actions={2} filters={1} />
  </PageContainer>
);

export default Loading;
