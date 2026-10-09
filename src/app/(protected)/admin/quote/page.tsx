import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";
import { QuoteListSkeleton } from "@/app/(protected)/_components/admin/quote/skeleton";

import { getCookies } from "@/actions/cookies";

import { QuoteContent } from "./quote-content";

interface QuotePageProps {
  // Every param the URL carries: sort, order and the facets too.
  searchParams: Record<string, string | string[] | undefined>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Orçamentos",
    description: `
      Gerencie todas as solicitações de orçamento recebidas.
      Acompanhe o status de cada lead, registre contatos realizados,
      adicione notas sobre negociações e converta prospects em clientes.
      Otimize seu processo de vendas com visibilidade completa do funil comercial.`,
  };
}

const Quote = async ({
  searchParams,
}: QuotePageProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Orçamentos"}
        description="Gerencie todas as solicitações de orçamento e acompanhe o processo de vendas."
      />

      <Suspense fallback={<QuoteListSkeleton />}>
        <QuoteContent searchParams={searchParams} token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Quote;
