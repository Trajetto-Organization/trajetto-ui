import { Suspense } from "react";
import { Metadata } from "next";

import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { RoutesContent } from "@/features/routes/content";

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
    description: "Acompanhe as rotas de qualquer empresa da plataforma.",
  };
}

const AdminRoutes = async ({
  searchParams,
}: RoutesQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) redirect("/login");

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Rotas"}
        description="Selecione uma empresa para acompanhar as rotas da operação dela."
      />

      {/* Two levels of fallback: loading.tsx covers the whole segment while
      Next navigates, and this one covers only the async content, so the
      heading paints immediately and the table streams in under it. */}
      <Suspense fallback={<ProtectedTableContentLoading />}>
        <RoutesContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminRoutes;
