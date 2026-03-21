import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { ServiceOrderContent } from "./service-order-content";

interface ServiceOrderQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ordem de serviço",
    description: `
      Gerencie facilmente as ordens de serviço cadastradas. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const ServiceOrder = async ({
  searchParams,
}: ServiceOrderQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Ordem de serviço"}
        description="Gerencie as ordens de serviços cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <ServiceOrderContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default ServiceOrder;
