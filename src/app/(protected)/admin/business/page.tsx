import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";

import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";

import { getCookies } from "@/actions/cookies";

import { BusinessActions } from "./page-actions";
import { BusinessContent } from "./business-content";

interface BusinessQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Empresas",
    description: `
      Gerencie facilmente suas empresas cadastradas. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const Business = async ({
  searchParams,
}: BusinessQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Empresas"}
        description="Gerencie empresas cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <BusinessActions />
      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <BusinessContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Business;
