import { Metadata } from "next";
import { getCookies } from "@/actions/cookies";

import { redirect } from "next/navigation";

import PageContainer from "../_components/layout/protected-page-container";
import { ProtectedHeading } from "../_components/layout/protected-heading";

import { AdminDashboard } from "../_components/admin-dashboard";
import { getDashboardData } from "@/actions/dashboard";

import { DashboardData } from "../_components/admin-dashboard/dto";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Dashboard",
    description: `Central de controle e análise para gestão completa do sistema de frotas. 
    Monitore veículos, motoristas, manutenções e atividades.`,
  };
}

const Admin = async (): Promise<JSX.Element> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    redirect("/login");
  }

  let userResponseError = {
    error: false,
    errorMessage: "",
  };

  let dashboardResponseError = {
    error: false,
    errorMessage: "",
  };

  let userLogged = null;
  let dashboardData: DashboardData = {
    counts: {
      vehicles: { value: 0, change: 0 },
      drivers: { value: 0, change: 0 },
      businesses: { value: 0, change: 0 },
      branches: { value: 0, change: 0 },
      parts: { value: 0, change: 0 },
      suppliers: { value: 0, change: 0 },
      serviceOrders: { value: 0, change: 0 },
      users: { value: 0, change: 0 },
      fines: { value: 0, change: 0 },
    },
    vehicleStatus: [],
    maintenanceStats: [],
    activityTrends: [],
    recentActivity: [],
    vehiclesByType: [],
    maintenanceCosts: [],
  };

  let userResponse: Response | undefined;

  try {
    userResponse = await fetch(`${process.env.HTTP_REQUEST}/user/me`, {
      headers: {
        Authorization: `Bearer ${tokenAccess}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      next: { tags: ["update-username", "update-2fa"] },
    });
  } catch (error) {
    userResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar obter os dados do usuário",
    };
  }

  if (userResponse) {
    if (!userResponse.ok) {
      if (userResponse.status === 401) {
        redirect("/login");
      }

      userResponseError = {
        error: true,
        errorMessage: "Houve um erro ao tentar obter os dados do usuário",
      };
    } else {
      const userData = await userResponse.json();
      userLogged = userData.user;
    }
  }

  // Fetch dashboard data with error handling
  try {
    dashboardData = (await getDashboardData(tokenAccess)) as DashboardData;
  } catch (error) {
    dashboardResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar carregar os dados do dashboard",
    };
  }

  return (
    <PageContainer>
      <ProtectedHeading
        title={"Dashboard"}
        description="Central de controle e análise para monitoramento completo do sistema de gestão de frotas."
      />

      <AdminDashboard
        initialData={dashboardData}
        userLogged={userLogged}
        dashboardError={dashboardResponseError}
        userError={userResponseError}
        basePath="/dashboard"
      />
    </PageContainer>
  );
};

export default Admin;
