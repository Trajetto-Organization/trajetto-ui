import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCookies } from "@/actions/cookies";

import PageContainer from "../_components/layout/protected-page-container";
import { ProtectedHeading } from "../_components/layout/protected-heading";

import { ProtectedStatsContentLoading } from "../_components/loading-page/protected-stats-content-loading";
import { DashboardContent } from "./dashboard-content";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dashboard",
    description: `Central de controle e análise para gestão completa do sistema de frotas.
    Monitore veículos, motoristas, manutenções e atividades.`,
  };
}

const Dashboard = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Dashboard"}
        description="Central de controle e análise da operação da sua empresa, conforme os módulos contratados."
      />

      <Suspense fallback={<ProtectedStatsContentLoading />}>
        <DashboardContent token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Dashboard;
