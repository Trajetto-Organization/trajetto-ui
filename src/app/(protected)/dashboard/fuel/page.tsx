import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { FuelContent } from "@/features/fuel/content";
import { FuelSkeleton } from "@/features/fuel/skeleton";

interface FuelPageProps {
  // Every param the URL carries: page, search, sort, order, the facets and,
  // on /admin, the company picked at the top.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Abastecimento",
    description:
      "Gerencie os abastecimentos da frota: consulte, filtre, edite e acompanhe litros e gastos.",
  };
}

const DashboardFuel = async ({
  searchParams,
}: FuelPageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Abastecimento"
        description="Registre, filtre e corrija os abastecimentos da frota e acompanhe litros e gasto."
      />

      {/* loading.tsx covers the segment while Next navigates; this covers
          only the async content, so the heading paints at once. */}
      <Suspense fallback={<FuelSkeleton mode="dashboard" />}>
        <FuelContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardFuel;
