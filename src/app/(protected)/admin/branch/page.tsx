import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { BranchActions } from "./page-actions";
import { BranchContent } from "./branch-content";

interface BranchQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Filiais",
    description: `
      Centralize o controle de todas as suas filiais em um só lugar.
      Visualize, cadastre e organize unidades regionais com precisão,
      monitore desempenho por localidade e otimize operações descentralizadas
      com nossa plataforma integrada de gestão de filiais.
      Expanda seu negócio com governança e visibilidade total.`,
  };
}

const Branch = async ({
  searchParams,
}: BranchQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Filiais"}
        description="Controle centralizado de unidades regionais. Cadastre, monitore e gerencie suas filiais com precisão e eficiência."
      />

      <BranchActions />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <BranchContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Branch;
