import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { FuelTypeContent } from "./fuel-type-content";

interface FuelTypeQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipo de Combustível",
    description: `
      Gerencie facilmente seus tipos de combustíveis cadastrados. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const FuelType = async ({
  searchParams,
}: FuelTypeQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Tipo de Combustível"}
        description="Gerencie os tipos de combustíveis cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <FuelTypeContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default FuelType;
