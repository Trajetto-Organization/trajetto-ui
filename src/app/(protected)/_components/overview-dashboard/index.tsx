"use client";

import Link from "next/link";
import {
  AlertCircle,
  LineChart as LineChartIcon,
  Info,
  ChartArea,
  Zap,
} from "lucide-react";

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

import { Button } from "@/components/ui/button";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import type { OverviewDashboardProps } from "./shared/common.types";
import { ButtonRevalidation } from "./revalidation-button";

import { Charts } from "./charts";
import { useTabTutorial } from "./hooks/tab-tutorial";

import { getStatusBadge } from "./status-badge";
import { quickLinks, statCards } from "./data";

import { displayValue, formatNotificationDate } from "@/lib/format-values";
import { LimitsContent } from "../shared/limits/limits-content";

import { QuickLinkCard } from "./quick-link-card";
import { StatCard } from "./stat-card";

const OverviewDashboard = ({
  initialData,
  userLogged,
  dashboardError,
  userError,
  basePath,
}: OverviewDashboardProps): JSX.Element => {
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

  const hasUserError = userError?.error || !userLogged;

  return (
    <div data-tutorial="welcome">
      <Tabs defaultValue="overview" className="space-y-6 my-9">
        <div
          className="flex flex-col gap-4 lg:flex-row
          lg:items-center"
        >
          <TabsList data-tutorial="dashboard-tabs" className="w-full lg:w-auto">
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-1
              flex-1 lg:flex-initial"
              data-tutorial="overview-tab"
            >
              <LineChartIcon className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>

            {canView() && (
              <TabsTrigger
                value="charts"
                className="flex items-center space-x-1
                flex-1 lg:flex-initial"
                data-tutorial="charts-tab"
              >
                <ChartArea className="h-4 w-4" />
                <span>Análise Gráfica</span>
              </TabsTrigger>
            )}

            {canView() && (
              <TabsTrigger
                value="limits"
                className="flex items-center space-x-1
                flex-1 lg:flex-initial"
                data-tutorial="limits-tab"
              >
                <Zap className="h-4 w-4" />
                <span>Limites de Uso</span>
              </TabsTrigger>
            )}
          </TabsList>
          <ButtonRevalidation
            className="lg:w-auto lg:ml-auto"
            buttonClassName="w-full lg:w-auto"
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
              "update-ai-usage",
            ]}
            rateLimit={{
              storageKey: "admin-dashboard",
              maxClicks: 3,
              timeWindowMs: 30000,
              cooldownTimeMs: 15000,
            }}
          />
        </div>

        {canView() && (
          <TabsContent value="charts" data-tutorial="charts-content">
            <Charts dashboardData={initialData} userRole={userLogged?.role} />
          </TabsContent>
        )}

        {canView() && (
          <TabsContent value="limits" data-tutorial="limits-content">
            <LimitsContent
              mode={basePath === "/admin" ? "admin" : "dashboard"}
              showBusinessSelector={basePath === "/admin"}
            />
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
            className="grid grid-cols-1 gap-4 
            sm:grid-cols-2 lg:grid-cols-4"
            data-cards
          >
            {statCards(counts).map(
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
              <div
                className="flex flex-col gap-3 
                sm:flex-row sm:items-center 
                sm:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <CardTitle>Atividades Recentes</CardTitle>
                  <CardDescription className="mt-1">
                    Últimas ações realizadas no sistema
                  </CardDescription>
                </div>

                {/* View All Button - MASTER and BUSINESS_ADMIN Only */}
                {!hasUserError &&
                  (userLogged?.role === "MASTER" ||
                    userLogged?.role === "BUSINESS_ADMIN") && (
                    <Link
                      href={`${basePath}/activity`}
                      className="flex-shrink-0"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <ChartArea className="h-4 w-4" />
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
                    <TableRow className="truncate">
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
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
                          {displayValue(activity.type)}
                        </TableCell>
                        <TableCell>
                          {displayValue(activity.description)}
                        </TableCell>
                        <TableCell>
                          {displayValue(activity.user?.name)}
                        </TableCell>
                        <TableCell>
                          {displayValue(activity.user?.email)}
                        </TableCell>
                        {!hasUserError && userLogged?.role === "MASTER" && (
                          <TableCell>
                            {displayValue(activity.business?.corporate_reason)}
                          </TableCell>
                        )}
                        <TableCell>
                          {displayValue(
                            formatNotificationDate(
                              activity.created_at,
                              "pt-BR",
                            ),
                          )}
                        </TableCell>
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

export { OverviewDashboard };
