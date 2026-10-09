import { Suspense } from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { ServiceOrderPartContent } from "@/features/service-order/order-parts/content";
import { MaintenanceListSkeleton } from "@/features/service-order/skeleton";

interface PageProps {
  // Every param the URL carries: sort, order and the server-side filters too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Peças das ordens de serviço",
    description:
      "As peças lançadas nas ordens de serviço da frota, com quantidades, descontos e valores.",
  };
}

const DashboardServiceOrderPart = async ({
  searchParams,
}: PageProps): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title="Peças das ordens de serviço"
        description="Lance as peças usadas em cada ordem de serviço e acompanhe quanto elas somam."
      />

      {/* loading.tsx covers the navigation; this covers only the async
          content, so the heading paints first. */}
      <Suspense
        fallback={
          <MaintenanceListSkeleton mode="dashboard" actions={2} filters={1} />
        }
      >
        <ServiceOrderPartContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardServiceOrderPart;
