import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverFuelsList } from "@/app/(protected)/_components/driver/fuels";
import { BackButton } from "@/app/(protected)/_components/driver/back-button";

import { getCookies } from "@/actions/cookies";
import { parseJwt } from "@/lib/decode-jwt";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimentos do Veículo",
    description: "Visualize o histórico de abastecimentos do veículo",
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

  const decodeJwt = parseJwt(tokenAccess);
  const driverId = decodeJwt?.driverId || null;

  const { vehicleId } = params;

  return (
    <PageContainer>
      <BackButton title="Voltar" />

      <ProtectedHeading
        title="Abastecimentos do Veículo"
        description="Visualize o histórico completo de abastecimentos deste veículo"
      />

      <DriverFuelsList vehicleId={vehicleId} driverId={driverId} />
    </PageContainer>
  );
};

export default DriverFuels;
