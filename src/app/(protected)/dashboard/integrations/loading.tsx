import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { IntegrationsSkeleton } from "@/features/integrations/skeleton";

/**
 * What Next paints while the page answers: the page's own shape, not the
 * generic table skeleton. The title and the description are already known,
 * so they are words rather than grey bars.
 */
const Loading = (): JSX.Element => {
  return (
    <PageContainer>
      <ProtectedHeading
        title="Integrações"
        description="Emita chaves de API, aponte webhooks para os sistemas dos seus clientes e acompanhe o que foi entregue."
      />

      <IntegrationsSkeleton mode="dashboard" />
    </PageContainer>
  );
};

export default Loading;
