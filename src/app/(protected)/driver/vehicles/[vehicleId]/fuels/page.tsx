import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverFuelsList } from "@/app/(protected)/_components/driver/fuels";
import { BackButton } from "@/app/(protected)/_components/driver/back-button";

import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Meus abastecimentos deste veículo",
    description: "Os abastecimentos que você registrou neste veículo",
  };
}

interface DriverFuelsProps {
  params: {
    vehicleId: string;
  };
}

const DriverFuels = async ({
  params,
}: DriverFuelsProps): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const { vehicleId } = params;

  return (
    <PageContainer>
      <BackButton title="Voltar" />

      {/* The API returns only the driver's own refuelings (DRV-SCOPE-1). */}
      <ProtectedHeading
        title="Meus abastecimentos deste veículo"
        description="Os abastecimentos que você registrou neste veículo, do mais recente ao mais antigo"
      />

      <DriverFuelsList vehicleId={vehicleId} />
    </PageContainer>
  );
};

export default DriverFuels;
