import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverSkeleton } from "@/features/driver/skeleton";

/** The title as the page prints it, then the screen's own composition. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Motoristas"
      description="Gerencie os motoristas cadastrados, delete, edite e mantenha os dados sempre atualizados."
    />

    <DriverSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
