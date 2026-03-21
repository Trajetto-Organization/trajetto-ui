import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { PartContent } from "./part-content";

interface PartQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Peças",
    description: `
      Otimize a gestão completa do inventário de peças da sua frota.
      Cadastre, rastreie e monitore todas as peças e componentes automotivos,
      controle níveis de estoque, acompanhe custos unitários,
      planeje manutenções preventivas e reduza tempo de inatividade dos veículos
      com nossa plataforma integrada de gestão de peças.
      Maximize a vida útil da sua frota com manutenção eficiente.`,
  };
}

const Part = async ({
  searchParams,
}: PartQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Peças"}
        description="Cadastre, monitore preços e gerencie todas as peças necessárias para manutenção eficiente da sua frota."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <PartContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Part;
