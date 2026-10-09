import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { FuelContent } from "@/features/fuel/content";
import { FuelSkeleton } from "@/features/fuel/skeleton";
import { readBusinessIdParam } from "@/lib/business-id-param";

interface FuelPageProps {
  // Every param the URL carries: page, search, sort, order, the facets and,
  // on /admin, the company picked at the top.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimento",
    description:
      "Consulte, filtre e corrija os abastecimentos da frota de qualquer empresa da plataforma.",
  };
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const AdminFuel = async ({
  searchParams,
}: FuelPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Abastecimento"
        description="Selecione uma empresa para ver, filtrar e corrigir os abastecimentos da frota dela."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense
        fallback={
          <FuelSkeleton
            mode="admin"
            hasCompany={Boolean(
              readBusinessIdParam(firstParam(searchParams.businessId)),
            )}
          />
        }
      >
        <FuelContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminFuel;
