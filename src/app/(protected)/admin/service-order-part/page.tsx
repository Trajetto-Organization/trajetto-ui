import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { ServiceOrderPartActions } from "./page-actions";
import { ServiceOrderPartContent } from "./service-order-part-content";

interface ServiceOrderPartQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Ordem de serviço por peça",
    description: `
      Gerencie facilmente as ordens de serviço das peças cadastradas. Consulte, edite e
      remova informações essenciais de maneira rápida e segura.`,
  };
}

const ServiceOrderPart = async ({
  searchParams,
}: ServiceOrderPartQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Ordem de serviço por peça"}
        description="Gerencie as ordens de serviços das peças cadastradas, delete, edite e mantenha os dados sempre atualizados."
      />

      <ServiceOrderPartActions />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <ServiceOrderPartContent
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default ServiceOrderPart;
