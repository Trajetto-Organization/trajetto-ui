import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { RouteDetailSkeleton } from "@/features/routes/detail-page/skeleton";

/** The route page while the server answers: the title is known, so printed. */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Rota"
        description="Escolha as entregas, defina a sequência e libere para o motorista."
      />

      <RouteDetailSkeleton withSelector={true} />
    </PageContainer>
  );
};

export default Loading;
