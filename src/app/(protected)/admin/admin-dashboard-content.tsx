import { redirect } from "next/navigation";

import { OverviewDashboard } from "../_components/overview-dashboard";
import { getDashboardData } from "@/actions/dashboard";
import { readSessionUser } from "@/lib/session-access";

import type {
  DashboardData,
  OverviewDashboardProps,
} from "../_components/overview-dashboard/shared/common.types";

interface AdminDashboardContentProps {
  token: string;
}

const AdminDashboardContent = async ({
  token,
}: AdminDashboardContentProps): Promise<JSX.Element> => {
  let userResponseError = {
    error: false,
    errorMessage: "",
  };

  let dashboardResponseError = {
    error: false,
    errorMessage: "",
  };

  let userLogged: OverviewDashboardProps["userLogged"];
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

  // Independent reads, started together: the session (already read by the
  // protected layout in this request — readSessionUser reuses that answer)
  // and the overview. They used to run one after the other.
  const [session, dashboard] = await Promise.all([
    readSessionUser(token),
    getDashboardData(token).then(
      (data) => ({ ok: true as const, data: data as DashboardData }),
      () => ({ ok: false as const }),
    ),
  ]);

  if (session.kind === "ok") {
    userLogged = {
      ...session.user,
      profileAccess: session.user.profileAccess ?? undefined,
    };
  } else if (session.kind === "refused" && session.status === 401) {
    redirect("/login");
  } else {
    userResponseError = {
      error: true,
      errorMessage:
        session.kind === "unreachable"
          ? "Ocorreu um erro inesperado ao tentar obter os dados do usuário"
          : "Houve um erro ao tentar obter os dados do usuário",
    };
  }

  if (dashboard.ok) {
    dashboardData = dashboard.data;
  } else {
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
      basePath="/admin"
    />
  );
};

export { AdminDashboardContent };
