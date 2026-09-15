import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedTableContentLoading } from "@/app/(protected)/_components/loading-page/protected-table-content-loading";
import { getCookies } from "@/actions/cookies";

import { ControlTowerContent } from "@/features/control-tower/content";

interface ControlTowerQueryParamsProps {
  searchParams: { businessId?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Torre de Controle",
    description: `
      Onde os veículos estão agora, o funil de documentos do dia, a
      pontualidade das saídas e os últimos eventos da operação.`,
  };
}

const AdminControlTower = async ({
  searchParams,
}: ControlTowerQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Torre de Controle"}
        description="Selecione a empresa para ver onde os veículos dela estão agora."
      />

      <Suspense fallback={<ProtectedTableContentLoading />}>
        <ControlTowerContent mode="admin" searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
};

export default AdminControlTower;
