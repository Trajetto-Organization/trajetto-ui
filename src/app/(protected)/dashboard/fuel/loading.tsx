import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { FuelSkeleton } from "@/features/fuel/skeleton";

/**
 * The page as it will be, before the server answers: the real heading (it is
 * known before anything is fetched) over the same skeleton the Suspense
 * fallback draws.
 */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Abastecimento"
      description="Registre, filtre e corrija os abastecimentos da frota e acompanhe litros e gasto."
    />

    <FuelSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
