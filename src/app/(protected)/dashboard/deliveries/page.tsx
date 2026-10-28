import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { getCookies } from "@/actions/cookies";

import { DeliveriesContent } from "@/features/deliveries/content";
import { DeliveriesSkeleton } from "@/features/deliveries/skeleton";
import { movedDeliveryTabHref } from "@/features/deliveries/lib/tabs";

interface DeliveriesQueryParamsProps {
  /** Every param of the URL: the table's sort, facets and period too. */
  searchParams: {
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    businessId?: string;
  } & Record<string, string | string[] | undefined>;
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

  // Monitoramento, Ocorrências, Atendimentos and Auditoria are views of the
  // Torre since the meeting of 14/10/2026. Their old links — notifications,
  // e-mails, bookmarks — land there with every other param kept.
  const moved = movedDeliveryTabHref("/dashboard", searchParams);

  if (moved) {
    redirect(moved);
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Entregas"}
        description="Acompanhe as entregas da sua operação, cadastre embarcadores e mantenha os tipos de ocorrência sempre atualizados."
      />

      <Suspense fallback={<DeliveriesSkeleton mode="dashboard" />}>
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
