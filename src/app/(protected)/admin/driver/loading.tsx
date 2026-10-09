import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverSkeleton } from "@/features/driver/skeleton";

/**
 * The title is known before anything is fetched, so it is printed; the rest
 * is the screen's own composition, selector included.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Motoristas"
      description="Selecione uma empresa para gerenciar os motoristas dela: dados pessoais, CNH, filial e situação."
    />

    <DriverSkeleton mode="admin" />
  </PageContainer>
);

export default Loading;
