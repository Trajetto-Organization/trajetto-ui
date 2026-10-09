import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { VehicleTypeContent } from "@/features/vehicle-type/content";
import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";
import { readBusinessIdParam } from "@/lib/business-id-param";

interface PageProps {
  // Every param Next hands over: the list forwards sort and filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipos de Veículo",
    description:
      "Os tipos de veículo da frota: eixos padrão e a categoria de CNH exigida para dirigir.",
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const AdminVehicleType = async ({
  searchParams,
}: PageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Tipos de Veículo"
        description="Selecione uma empresa para ver e cadastrar os tipos de veículo dela."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the list, so the heading paints at once. */}
      <Suspense
        fallback={
          <CatalogListSkeleton
            mode="admin"
            columns={6}
            hasCompany={Boolean(
              readBusinessIdParam(firstParam(searchParams.businessId)),
            )}
          />
        }
      >
        <VehicleTypeContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminVehicleType;
