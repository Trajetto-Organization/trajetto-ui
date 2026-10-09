import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { FuelTypeContent } from "@/features/fuel-type/content";
import { FuelTypeSkeleton } from "@/features/fuel-type/skeleton";

interface FuelTypePageProps {
  // Every param the URL carries: page, search, sort, order and, on /admin,
  // the company picked at the top.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipo de Combustível",
    description:
      "Gerencie os tipos de combustível da frota: cadastre, edite e exclua os que não estão em uso.",
  };
}

const DashboardFuelType = async ({
  searchParams,
}: FuelTypePageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Tipo de Combustível"
        description="Cadastre os combustíveis que a frota usa: cada veículo é cadastrado com o seu."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense fallback={<FuelTypeSkeleton mode="dashboard" />}>
        <FuelTypeContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardFuelType;
