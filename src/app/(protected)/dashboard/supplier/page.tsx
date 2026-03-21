import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { SupplierContent } from "./supplier-content";

interface SupplierQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Fornecedores",
    description: `
      Gerencie de forma integrada todos os seus fornecedores e parceiros comerciais.
      Cadastre, visualize e controle informações detalhadas de cada fornecedor,
      acompanhe históricos de fornecimento, mantenha dados de contato atualizados e
      otimize seus processos de compra e gerenciamneto com a nossa plataforma.`,
  };
}

const Supplier = async ({
  searchParams,
}: SupplierQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Fornecedores"}
        description="Controle centralizado de parceiros comerciais. Cadastre, monitore e gerencie seus fornecedores."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <SupplierContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Supplier;
