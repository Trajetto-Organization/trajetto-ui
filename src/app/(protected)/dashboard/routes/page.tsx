import { Suspense } from "react";
import { Metadata } from "next";

import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { RoutesContent } from "@/features/routes/content";
import { RoutesSkeleton } from "@/features/routes/skeleton";

interface RoutesQueryParamsProps {
  searchParams: {
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rotas",
    description: "Planeje as rotas da operação, defina a ordem das paradas e acompanhe o que já foi resolvido.",
  };
}

const DashboardRoutes = async ({
  searchParams,
}: RoutesQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Rotas"}
        description="Monte o dia de cada motorista, libere a rota e acompanhe as paradas até o fim."
      />

      {/* Two levels of fallback: loading.tsx covers the whole segment while
      Next navigates, and this one covers only the async content, so the
      heading paints immediately and the table streams in under it. */}
      <Suspense fallback={<RoutesSkeleton mode="dashboard" />}>
        <RoutesContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardRoutes;
