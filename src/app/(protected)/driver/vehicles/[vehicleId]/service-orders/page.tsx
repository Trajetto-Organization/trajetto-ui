import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverServiceOrdersList } from "@/app/(protected)/_components/driver/service-orders";

import { BackButton } from "@/app/(protected)/_components/driver/back-button";
import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ordens de Serviço do Veículo",
    description: "Visualize o histórico de ordens de serviço do veículo",
  };
}

interface DriverServiceOrdersProps {
  params: {
    vehicleId: string;
  };
}

const DriverServiceOrders = async ({
  params,
}: DriverServiceOrdersProps): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  const { vehicleId } = params;

  return (
    <PageContainer>
      <BackButton title="Voltar" />

      <ProtectedHeading
        title="Ordens de Serviço do Veículo"
        description="Visualize o histórico completo de manutenções deste veículo"
      />

      <DriverServiceOrdersList vehicleId={vehicleId} />
    </PageContainer>
  );
};

export default DriverServiceOrders;
