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
        description="Selecione a empresa para emitir chaves, apontar webhooks e acompanhar o que foi entregue aos sistemas dela."
      />

      <IntegrationsSkeleton mode="admin" />
    </PageContainer>
  );
};

export default Loading;
