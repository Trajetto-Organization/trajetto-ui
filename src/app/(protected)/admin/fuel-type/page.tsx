import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { FuelTypeContent } from "@/features/fuel-type/content";
import { FuelTypeSkeleton } from "@/features/fuel-type/skeleton";
import { readBusinessIdParam } from "@/lib/business-id-param";

interface FuelTypePageProps {
  // Every param the URL carries: page, search, sort, order and, on /admin,
  // the company picked at the top.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Tipo de Combustível",
    description:
      "Consulte e mantenha os tipos de combustível da frota de qualquer empresa da plataforma.",
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const AdminFuelType = async ({
  searchParams,
}: FuelTypePageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Tipo de Combustível"
        description="Selecione uma empresa para ver e manter os combustíveis que a frota dela usa."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense
        fallback={
          <FuelTypeSkeleton
            mode="admin"
            hasCompany={Boolean(
              readBusinessIdParam(firstParam(searchParams.businessId)),
            )}
          />
        }
      >
        <FuelTypeContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminFuelType;
