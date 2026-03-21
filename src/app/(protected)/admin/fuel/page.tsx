import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { FuelContent } from "./fuel-content";

interface FuelQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimento",
    description: `
      Gerencie facilmente os abastecimentos cadastrados. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Fuel = async ({
  searchParams,
}: FuelQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Abastecimento"}
        description="Gerencie os abastecimentos cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <FuelContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Fuel;
