"use client";

import Link from "next/link";

import {
  Users,
  Car,
  Building2,
  Briefcase,
  Package,
  FileText,
  Container,
  AlertCircle,
  LineChart as LineChartIcon,
  Info,
  ChartArea,
  Receipt,
} from "lucide-react";

import { motion } from "framer-motion";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { DashboardData, StatusBadgeProps } from "./dto";
import { ButtonRevalidation } from "../revalidation-button";

import { Charts } from "./charts";
import { useTabTutorial } from "./hooks/use-tab-tutorial";

import { Button } from "@/components/ui/button";

interface QuickLinkCardProps {
  title: string;
  href: string;
  color: string;
  icon: JSX.Element;
}

interface StatCardProps {
  title: string;
  icon: JSX.Element;
  color: string;
  change: number;
  value: number;
}

interface AdminDashboardProps {
  initialData: DashboardData;
  userLogged?: {
    role: string;
    name: string;
    email: string;
    profileAccess?: {
      permissions?: Array<{
        permissionKey: string;
        canRead: boolean;
        canWrite: boolean;
      }>;
    };
  };
  dashboardError?: {
    error: boolean;
    errorMessage: string;
  };
  userError?: {
    error: boolean;
    errorMessage: string;
  };
  basePath: string;
}

const AdminDashboard = ({
  initialData,
  userLogged,
  dashboardError,
  userError,
  basePath,
}: AdminDashboardProps) => {
  const { counts, recentActivity } = initialData;

  // Hook for monitoring tab changes
  useTabTutorial();

  // Helper function to check if a user has permission
  const hasPermission = (permissionKey: string): boolean => {
    if (
      !userLogged ||
      !userLogged.profileAccess ||
      !userLogged.profileAccess.permissions
    ) {
      return false;
    }

    return userLogged.profileAccess.permissions.some(
      (perm) =>
        perm.permissionKey === permissionKey && (perm.canRead || perm.canWrite),
    );
  };

  // Decide whether or not to display each card, based on role and permissions
  const shouldDisplayCard = (cardType: string): boolean => {
    if (!userLogged) return true;

    // MASTER sees everything
    if (userLogged.role === "MASTER") return true;

    // BUSINESS_ADMIN sees everything except "businesses"
    if (userLogged.role === "BUSINESS_ADMIN") {
      return cardType !== "businesses";
    }

    if (userLogged.role === "BUSINESS_USER") {
      const permissionMap: Record<string, string> = {
        vehicles: "vehicle_manage",
        drivers: "driver_manage",
        businesses: "business_manage",
        branches: "branch_manage",
        parts: "part_manage",
        suppliers: "supplier_manage",
        serviceOrders: "service_order_manage",
        users: "user_registration_manage",
        fines: "fine_manage",
      };

      const requiredPermission = permissionMap[cardType];
      return requiredPermission ? hasPermission(requiredPermission) : false;
    }

    return true;
  };

  // Check if the user can see the charts tab
  const canView = (): boolean => {
    if (!userLogged) return true;
    return userLogged.role === "MASTER" || userLogged.role === "BUSINESS_ADMIN";
  };

  const getStatusBadge = (status: StatusBadgeProps) => {
    switch (status) {
      case "Ativo":
        return (
          <Badge variant="outline" className="bg-green-600 text-white">
            {status}
          </Badge>
        );
      case "Inativo":
        return (
          <Badge variant="outline" className="bg-slate-400 text-white">
            {status}
          </Badge>
        );
      case "Bloqueado":
        return <Badge variant="destructive">{status}</Badge>;
      case "Em Rota":
        return (
          <Badge variant="outline" className="bg-blue-500 text-white">
            {status}
          </Badge>
        );
      case "Completo":
        return (
          <Badge variant="outline" className="bg-emerald-500 text-white">
            {status}
          </Badge>
        );
      case "Pendente":
        return (
          <Badge variant="outline" className="bg-yellow-400 text-white">
            {status}
          </Badge>
        );
      case "Atualizado":
        return (
          <Badge variant="outline" className="bg-indigo-500 text-white">
            {status}
          </Badge>
        );
      case "Deletado":
        return <Badge variant="destructive">{status}</Badge>;
      case "Criado":
        return (
          <Badge variant="outline" className="bg-green-600 text-white">
            {status}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasUserError = userError?.error || !userLogged;

  const statCards = [
    {
      type: "vehicles",
      title: "Veículos",
      value: counts?.vehicles?.value || 0,
      change: counts?.vehicles?.change || 0,
      icon: <Car className="h-4 w-4 text-white" />,
      color: "#3b82f6",
    },
    {
      type: "drivers",
      title: "Motoristas",
      value: counts?.drivers?.value || 0,
      change: counts?.drivers?.change || 0,
      icon: <Users className="h-4 w-4 text-white" />,
      color: "#10b981",
    },
    {
      type: "businesses",
      title: "Empresas",
      value: counts?.businesses?.value || 0,
      change: counts?.businesses?.change || 0,
      icon: <Briefcase className="h-4 w-4 text-white" />,
      color: "#8b5cf6",
    },
    {
      type: "branches",
      title: "Filiais",
      value: counts?.branches?.value || 0,
      change: counts?.branches?.change || 0,
      icon: <Building2 className="h-4 w-4 text-white" />,
      color: "#f97316",
    },
    {
      type: "parts",
      title: "Peças",
      value: counts?.parts?.value || 0,
      change: counts?.parts?.change || 0,
      icon: <Container className="h-4 w-4 text-white" />,
      color: "#ec4899",
    },
    {
      type: "suppliers",
      title: "Fornecedores",
      value: counts?.suppliers?.value || 0,
      change: counts?.suppliers?.change || 0,
      icon: <Package className="h-4 w-4 text-white" />,
      color: "#6366f1",
    },
    {
      type: "serviceOrders",
      title: "Ordens de Serviço",
      value: counts?.serviceOrders?.value || 0,
      change: counts?.serviceOrders?.change || 0,
      icon: <FileText className="h-4 w-4 text-white" />,
      color: "#14b8a6",
    },
    {
      type: "users",
      title: "Usuários",
      value: counts?.users?.value || 0,
      change: counts?.users?.change || 0,
      icon: <Users className="h-4 w-4 text-white" />,
      color: "#f43f5e",
    },
    {
      type: "fines",
      title: "Multas",
      value: counts?.fines?.value || 0,
      change: counts?.fines?.change || 0,
      icon: <Receipt className="h-4 w-4 text-white" />,
      color: "#dc2626",
    },
  ];

  const quickLinks = [
    {
      type: "users",
      title: "Gerenciar Usuários",
      path: "user-registration",
      icon: <Users className="h-6 w-6" />,
      color: "#3b82f6",
    },
    {
      type: "vehicles",
      title: "Veículos",
      path: "vehicle",
      icon: <Car className="h-6 w-6" />,
      color: "#10b981",
    },
    {
      type: "businesses",
      title: "Empresas",
      path: "business",
      icon: <Briefcase className="h-6 w-6" />,
      color: "#8b5cf6",
    },
    {
      type: "serviceOrders",
      title: "Ordens de Serviço",
      path: "service-order",
      icon: <FileText className="h-6 w-6" />,
      color: "#f97316",
    },
    {
      type: "drivers",
      title: "Motoristas",
      path: "driver",
      icon: <Users className="h-6 w-6" />,
      color: "#ec4899",
    },
    {
      type: "branches",
      title: "Filiais",
      path: "branch",
      icon: <Building2 className="h-6 w-6" />,
      color: "#6366f1",
    },
    {
      type: "parts",
      title: "Peças",
      path: "part",
      icon: <Container className="h-6 w-6" />,
      color: "#14b8a6",
    },
    {
      type: "suppliers",
      title: "Fornecedores",
      path: "supplier",
      icon: <Package className="h-6 w-6" />,
      color: "#f43f5e",
    },
    {
      type: "fines",
      title: "Multas",
      path: "fine",
      icon: <Receipt className="h-6 w-6" />,
      color: "#dc2626",
    },
  ];

  return (
    <div data-tutorial="welcome">
      <Tabs defaultValue="overview" className="space-y-6 my-9">
        <div
          className="flex flex-col gap-4 sm:flex-row 
          sm:items-center sm:justify-between"
        >
          <TabsList data-tutorial="dashboard-tabs" className="w-full sm:w-auto">
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-1 
              flex-1 sm:flex-initial"
              data-tutorial="overview-tab"
            >
              <LineChartIcon className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            {canView() && (
              <TabsTrigger
                value="charts"
                className="flex items-center space-x-1 
                flex-1 sm:flex-initial"
                data-tutorial="charts-tab"
              >
                <ChartArea className="h-4 w-4" />
                <span>Análise Gráfica</span>
              </TabsTrigger>
            )}
          </TabsList>
          <div className="flex justify-end">
            <ButtonRevalidation
              revalidateData={[
                "update-entity-count",
                "update-vehicle-status",
                "update-maintenance-stats",
                "update-recent-activity",
                "update-vehicle-by-type",
                "update-maintenance-costs",
                "update-vehicle-count",
                "update-driver-count",
                "update-business-count",
                "update-branch-count",
                "update-part-count",
                "update-supplier-count",
                "update-service-order-count",
                "update-user-count",
                "update-fine-count",
              ]}
              rateLimit={{
                storageKey: "admin-dashboard",
                maxClicks: 3,
                timeWindowMs: 30000,
                cooldownTimeMs: 15000,
              }}
            />
          </div>
        </div>

        {canView() && (
          <TabsContent value="charts" data-tutorial="charts-content">
            <Charts dashboardData={initialData} userRole={userLogged?.role} />
          </TabsContent>
        )}

        <TabsContent value="overview" data-tutorial="overview-content">
          {/* If there is an error fetching data from the dashboard */}
          {dashboardError?.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Dados do dashboard não disponíveis</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                {dashboardError.errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* If there is an error while fetching user data */}
          {hasUserError && (
            <Alert variant="default" className="mb-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Aviso</AlertTitle>
              <AlertDescription>
                {userError?.errorMessage ||
                  "Não foi possível obter dados do usuário atual. Algumas funcionalidades podem estar limitadas."}
              </AlertDescription>
            </Alert>
          )}

          {/* Count cards (statistics) */}
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            data-cards
          >
            {statCards.map(
              (card) =>
                shouldDisplayCard(card.type) && (
                  <StatCard
                    key={card.type}
                    title={card.title}
                    value={card.value}
                    change={card.change}
                    icon={card.icon}
                    color={card.color}
                  />
                ),
            )}
          </div>

          {/* Recent Activity Table */}
          <Card className="shadow-md mt-6" role="table">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Atividades Recentes</CardTitle>
                  <CardDescription className="mt-1">
                    Últimas ações realizadas no sistema
                  </CardDescription>
                </div>

                {/* View All Button - MASTER and BUSINESS_ADMIN Only */}
                {!hasUserError &&
                  (userLogged?.role === "MASTER" ||
                    userLogged?.role === "BUSINESS_ADMIN") && (
                    <Link href={`${basePath}/activity`}>
                      <Button variant="outline" size="sm">
                        <ChartArea className=" h-4 w-4" />
                        Ver todas
                      </Button>
                    </Link>
                  )}
              </div>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="w-[40%]">Descrição</TableHead>
                      <TableHead>Nome do usuário</TableHead>
                      <TableHead>E-mail do usuário</TableHead>
                      {!hasUserError && userLogged?.role === "MASTER" && (
                        <TableHead>Empresa</TableHead>
                      )}
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">
                          {activity.type}
                        </TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell>{activity.userName}</TableCell>
                        <TableCell>{activity.userEmail}</TableCell>
                        {!hasUserError && userLogged?.role === "MASTER" && (
                          <TableCell>{activity.business_name}</TableCell>
                        )}
                        <TableCell>{activity.date}</TableCell>
                        <TableCell>{getStatusBadge(activity.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div
                  className="py-6 text-center 
                  text-muted-foreground"
                >
                  {dashboardError?.error
                    ? "Não foi possível carregar as atividades recentes."
                    : "Nenhuma atividade recente encontrada."}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick access links (shortcuts)*/}
          <div
            className="grid grid-cols-2 gap-3 
            sm:gap-4 md:grid-cols-4 mt-6"
            data-quick-links
          >
            {quickLinks.map(
              (link) =>
                shouldDisplayCard(link.type) && (
                  <QuickLinkCard
                    key={link.type}
                    title={link.title}
                    icon={link.icon}
                    href={`${basePath}/${link.path}`}
                    color={link.color}
                  />
                ),
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ title, value, change, icon, color }: StatCardProps) => (
  <motion.div
    whileHover={{ y: -5 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <Card className="overflow-hidden shadow-md">
      <div className="flex">
        <div
          className="flex w-1/4 items-center 
          justify-center p-4"
          style={{ backgroundColor: color }}
        >
          {icon}
        </div>
        <div className="w-3/4">
          <CardHeader className="pb-2 pt-4">
            <CardTitle
              className="text-sm 
              font-medium truncate"
            >
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 pt-0">
            <div className="text-2xl font-bold">{value}</div>
            <p
              className={`mt-1 text-xs ${
                change > 0
                  ? "text-green-600"
                  : change < 0
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {change > 0 ? "+" : ""}
              {change}% em relação ao mês passado
            </p>
          </CardContent>
        </div>
      </div>
    </Card>
  </motion.div>
);

const QuickLinkCard = ({ title, icon, href, color }: QuickLinkCardProps) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
    className="h-full"
  >
    <Card
      className="shadow-md transition-all 
      hover:bg-muted/50 h-full min-h-[120px] 
      sm:min-h-[140px]"
    >
      <Link
        href={href}
        className="flex h-full flex-col items-center 
        justify-center p-4 sm:p-6 text-center"
      >
        <div
          className="mb-2 sm:mb-3 rounded-full 
          p-2 sm:p-3 flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color: color }}
        >
          {icon}
        </div>
        <CardTitle
          className="text-xs sm:text-sm 
          font-medium leading-tight"
        >
          {title}
        </CardTitle>
      </Link>
    </Card>
  </motion.div>
);

export { AdminDashboard };
