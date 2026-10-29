import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverPausesSkeleton } from "@/features/driver-pauses/skeleton";

/**
 * What a navigation to Pausas dos motoristas shows while the server answers:
 * the real title and description, and the page's own skeleton.
 */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Pausas dos motoristas"
        description="Selecione uma empresa para ver as pausas dos motoristas, dia a dia, com os alertas da Lei 13.103/2015."
      />

      <DriverPausesSkeleton mode="admin" />
    </PageContainer>
  );
};

export default Loading;
