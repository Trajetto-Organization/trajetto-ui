import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { VehicleTypeContent } from "./vehicle-type-content";

interface VehicleTypeQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipos de veículos",
    description: `
      Gerencie facilmente seus tipos de veículos cadastrados. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const VehicleType = async ({
  searchParams,
}: VehicleTypeQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title="Tipos de Veículos"
        description="Gerencie os tipos de veículos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <VehicleTypeContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default VehicleType;
