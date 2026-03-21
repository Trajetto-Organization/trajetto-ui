import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "@/app/(protected)/_components/layout/protected-page-container";
import { ProtectedHeading } from "@/app/(protected)/_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "@/app/(protected)/_components/loading-page/protected-stats-content-loading";
import { getCookies } from "@/actions/cookies";

import { VehicleChecklistContent } from "./vehicle-checklist-content";

interface VehicleChecklistQueryParamsProps {
  searchParams: { page?: string; pageSize?: string; search?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Checklist Veicular",
    description: `
      Gerencie facilmente os checklists veiculares cadastrados. Consulte, edite e
      remova informações essenciais de inspeções veiculares de maneira rápida e segura.`,
  };
}

const VehicleChecklist = async ({
  searchParams,
}: VehicleChecklistQueryParamsProps): Promise<JSX.Element | undefined> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Checklist Veicular"}
        description="Gerencie os checklists veiculares cadastrados, delete, edite e mantenha os dados sempre atualizados."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <VehicleChecklistContent
          searchParams={searchParams}
          token={tokenAccess}
        />
      </Suspense>
    </PageContainer>
  );
};

export default VehicleChecklist;
