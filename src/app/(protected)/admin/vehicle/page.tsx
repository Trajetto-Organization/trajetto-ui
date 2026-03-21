import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { VehicleContent } from "./vehicle-content";

interface VehicleQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Veículos",
    description: `
      Gerencie facilmente seus veículos cadastrados. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Vehicle = async ({
  searchParams,
}: VehicleQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Veículos"}
        description="Gerencie os veículos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <VehicleContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Vehicle;
