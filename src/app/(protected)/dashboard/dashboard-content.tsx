import { redirect } from "next/navigation";

import { OverviewDashboard } from "../_components/overview-dashboard";
import { getDashboardData } from "@/actions/dashboard";

import type { DashboardData } from "../_components/overview-dashboard/shared/common.types";

interface DashboardContentProps {
  token: string;
}

const DashboardContent = async ({
  token,
}: DashboardContentProps): Promise<JSX.Element> => {
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
    deliveryOperation: null,
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
        Authorization: `Bearer ${token}`,
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

  try {
    dashboardData = (await getDashboardData(token)) as DashboardData;
  } catch (error) {
    dashboardResponseError = {
      error: true,
      errorMessage:
        "Ocorreu um erro inesperado ao tentar carregar os dados do dashboard",
    };
  }

  return (
    <OverviewDashboard
      initialData={dashboardData}
      userLogged={userLogged}
      dashboardError={dashboardResponseError}
      userError={userResponseError}
      basePath="/dashboard"
    />
  );
};

export { DashboardContent };
