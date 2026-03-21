import { Suspense } from "react";

import { Metadata } from "next";
import { redirect } from "next/navigation";

import PageContainer from "../_components/layout/protected-page-container";
import { ProtectedHeading } from "../_components/layout/protected-heading";

import { ProtectedDashboardContentLoading } from "../_components/loading-page/protected-dashboard-content-loading";
import { AdminDashboardContent } from "./admin-dashboard-content";

import { getCookies } from "@/actions/cookies";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Painel Administrativo",
    description: `Central de controle e análise para gestão completa do sistema de frotas.
    Monitore veículos, motoristas, manutenções e atividades.`,
  };
}

const Admin = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Painel Administrativo"}
        description="Central de controle e análise para monitoramento completo do sistema de gestão de frotas."
      />

      <Suspense fallback={<ProtectedDashboardContentLoading />}>
        <AdminDashboardContent token={tokenAccess} />
      </Suspense>
    </PageContainer>
  );
};

export default Admin;
