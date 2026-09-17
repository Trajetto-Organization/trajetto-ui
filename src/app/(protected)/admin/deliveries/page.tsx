import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { DeliveriesContent } from "@/features/deliveries/content";
import { DeliveriesSkeleton } from "@/features/deliveries/skeleton";

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
      Gerencie as entregas das empresas: cadastro manual, importação de XML da NF-e,
      embarcadores, tipos de ocorrência e movimentação de status.`,
  };
}

const AdminDeliveries = async ({
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
        description="Selecione a empresa e acompanhe suas entregas, embarcadores e tipos de ocorrência."
      />

      <Suspense fallback={<DeliveriesSkeleton mode="admin" />}>
        <DeliveriesContent
          mode="admin"
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default AdminDeliveries;
