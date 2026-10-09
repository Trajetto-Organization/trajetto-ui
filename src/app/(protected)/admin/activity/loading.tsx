import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ActivitySkeleton } from "@/features/activity/skeleton";

/**
 * The page's own shape while Next navigates: the heading is known before
 * anything is fetched, so it is printed, and the rest is the skeleton.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Registro de Atividades"
      description="Tudo o que foi feito na plataforma, em todas as empresas: quem, o quê e quando."
    />

    <ActivitySkeleton />
  </PageContainer>
);

export default Loading;
