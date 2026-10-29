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
        description="Pausas de cada motorista por dia, com a jornada, a direção estimada e os alertas da Lei 13.103/2015."
      />

      <DriverPausesSkeleton mode="dashboard" />
    </PageContainer>
  );
};

export default Loading;
