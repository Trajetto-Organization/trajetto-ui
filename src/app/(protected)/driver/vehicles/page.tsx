import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { DriverVehiclesList } from "@/app/(protected)/_components/driver/vehicles";
import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Meus Veículos",
    description: "Visualize os veículos atribuídos a você",
  };
}

const DriverVehicles = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Meus Veículos"
        description="Visualize os veículos atribuídos a você e acompanhe suas informações"
      />

      <DriverVehiclesList />
    </PageContainer>
  );
};

export default DriverVehicles;
