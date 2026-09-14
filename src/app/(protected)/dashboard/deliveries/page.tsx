import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { DeliveriesContent } from "@/features/deliveries/content";

interface DeliveriesQueryParamsProps {
  searchParams: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Entregas",
    description: `
      Gerencie as entregas da sua operação: cadastro manual, importação de XML da NF-e,
      embarcadores, tipos de ocorrência e movimentação de status.`,
  };
}

const DashboardDeliveries = async ({
  searchParams,
}: DeliveriesQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Entregas"}
        description="Acompanhe as entregas da sua operação, cadastre embarcadores e mantenha os tipos de ocorrência sempre atualizados."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <DeliveriesContent
          mode="dashboard"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default DashboardDeliveries;
