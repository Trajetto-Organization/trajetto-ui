import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { FuelTypeSkeleton } from "@/features/fuel-type/skeleton";

/** The real heading over the same skeleton the Suspense fallback draws. */
const Loading = (): JSX.Element => (
  <PageContainer>
    <ProtectedHeading
      title="Tipo de Combustível"
      description="Cadastre os combustíveis que a frota usa: cada veículo é cadastrado com o seu."
    />

    <FuelTypeSkeleton mode="dashboard" />
  </PageContainer>
);

export default Loading;
