"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  LineChart as LineChartIcon,
  Info,
  ChartArea,
  ServerCog,
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
import {
  Tabs,
  ScrollableTabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import type { OverviewDashboardProps } from "./shared/common.types";
import type { PermissionKey, UserRole } from "../shared/common.types";

import { useAuthStore } from "@/store/auth-store";
import { canAccessPath, readablePermissionKeys } from "@/lib/route-access";
import { ButtonRevalidation } from "./revalidation-button";

import { Charts } from "./charts";
import { showsFleetCharts } from "./charts/visibility";
import { useTabTutorial } from "./hooks/tab-tutorial";

import { getStatusBadge } from "./status-badge";
import { quickLinks, statCards } from "./data";

import { displayValue, formatNotificationDate } from "@/lib/format-values";
import { comparisonDescription, comparisonLabel } from "@/lib/dashboard-counts";
import { LimitsContent } from "../shared/limits/limits-content";
import { SystemMetrics } from "@/features/system-metrics";
import { refreshSystemMetrics } from "@/features/system-metrics/reads";

import { QuickLinkCard } from "./quick-link-card";
import { StatCard, StatCardGrid } from "./stat-card";

import { OverviewEmptyState } from "./empty-state";
import { OperationPanel } from "./operation-panel";

const OverviewDashboard = ({
  initialData,
  userLogged,
  dashboardError,
  userError,
  basePath,
}: OverviewDashboardProps): JSX.Element => {
  const { counts, recentActivity, deliveryOperation } = initialData;

  // The open tab picks the tour (Visão geral, Análise Gráfica, Limites…),
  // and what "Atualizar" refreshes: Sistema reads only its own two queries.
  const setTutorialTab = useTabTutorial();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    setTutorialTab(tab);
  };

  // Both gates read the auth store, which the security check refreshes on
  // every socket event — that is what makes a granted or revoked permission
  // redraw these cards without a reload. The server-rendered props are only
  // the first-paint fallback, and they go stale the moment anything changes.
  const storeModules = useAuthStore((state) => state.enabledModules);
  const storePermissions = useAuthStore((state) => state.permissions);

  const enabledModules = storeModules ?? userLogged?.enabledModules ?? null;

  // Readable keys only: a row saved with canRead false opens no page, so it
  // must not draw a shortcut to one (ROUTE-KEY-1).
  const permissionKeys = readablePermissionKeys(
    storePermissions.length > 0
      ? storePermissions
      : (userLogged?.profileAccess?.permissions ?? []).map((permission) => ({
          permissionKey: permission.permissionKey as PermissionKey,
          canRead: permission.canRead,
        })),
  );

  /**
   * A shortcut is worth showing exactly when its page would open, so the
   * verdict comes from the route registry — permissions and hired modules
   * included. Unregistered paths are denied on purpose: that is what keeps
   * "Empresas" off a company dashboard, since /dashboard/business does not
   * exist.
   */
  const canReachCard = (path: string): boolean => {
    // No user data (the /me call failed) is not a verdict — the dashboard
    // still renders and the API remains the enforcement point.
    if (!userLogged) return true;

    return canAccessPath(
      `${basePath}/${path}`,
      {
        role: userLogged.role as UserRole,
        permissions: permissionKeys,
        enabledModules,
      },
      { unregistered: "deny" },
    );
  };

  // Check if the user can see the charts tab
  const canView = (): boolean => {
    if (!userLogged) return true;
    return userLogged.role === "MASTER" || userLogged.role === "BUSINESS_ADMIN";
  };

  // Infrastructure posture is the platform team's business, not a tenant's.
  const isMaster = userLogged?.role === "MASTER";

  const hasUserError = userError?.error || !userLogged;

  const visibleStatCards = statCards(counts).filter((card) =>
    canReachCard(card.path),
  );

  const visibleQuickLinks = quickLinks.filter((link) =>
    canReachCard(link.path),
  );

  // Both grids answer to the same permissions, so they empty together. When
  // they do, the screen says why instead of just dropping its content.
  const hasNoShortcuts =
    visibleStatCards.length === 0 && visibleQuickLinks.length === 0;

  return (
    <div data-tutorial="welcome">
      <Tabs
        defaultValue="overview"
        className="space-y-6 my-9"
        onValueChange={onTabChange}
      >
        <div
          className="flex flex-col gap-4 lg:flex-row
          lg:items-center"
        >
          {/* The product's one overflowing strip: one line, faded edges and
          arrows, no native scrollbar. A bare `overflow-x-auto` here drew a
          horizontal and a vertical bar inside the 40px box on Windows. */}
          <ScrollableTabsList
            data-tutorial="dashboard-tabs"
            wrapperClassName="w-full lg:w-fit"
          >
            <TabsTrigger
              value="overview"
              className="flex items-center space-x-1
              flex-1 px-2 sm:px-3 lg:flex-initial"
              data-tutorial="overview-tab"
            >
              <LineChartIcon className="h-4 w-4" />
              <span>Visão geral</span>
            </TabsTrigger>

            {canView() && (
              <TabsTrigger
                value="charts"
                className="flex items-center space-x-1
                flex-1 px-2 sm:px-3 lg:flex-initial"
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
                flex-1 px-2 sm:px-3 lg:flex-initial"
                data-tutorial="limits-tab"
              >
                <Zap className="h-4 w-4" />
                <span>Limites de Uso</span>
              </TabsTrigger>
            )}

            {isMaster && (
              <TabsTrigger
                value="system"
                className="flex items-center space-x-1
                flex-1 px-2 sm:px-3 lg:flex-initial"
                data-tutorial="system-tab"
              >
                <ServerCog className="h-4 w-4" />
                <span>Sistema</span>
              </TabsTrigger>
            )}
          </ScrollableTabsList>
          <ButtonRevalidation
            className="lg:w-auto lg:ml-auto"
            buttonClassName="w-full lg:w-auto"
            onRevalidate={
              isMaster && activeTab === "system"
                ? refreshSystemMetrics
                : undefined
            }
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
            <Charts
              dashboardData={initialData}
              userRole={userLogged?.role}
              showFleetCharts={showsFleetCharts(
                userLogged?.role,
                enabledModules,
              )}
            />
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

        {isMaster && (
          <TabsContent value="system" data-tutorial="system-content">
            <SystemMetrics />
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
          {hasNoShortcuts ? (
            <OverviewEmptyState />
          ) : (
            visibleStatCards.length > 0 && (
              <StatCardGrid>
                {visibleStatCards.map((card) => (
                  <StatCard
                    key={card.type}
                    title={card.title}
                    value={card.value}
                    change={card.change}
                    comparison={comparisonLabel(card.basis)}
                    comparisonTitle={comparisonDescription(card.basis)}
                    icon={card.icon}
                    color={card.color}
                  />
                ))}
              </StatCardGrid>
            )
          )}

          {/*
            The operation block, between the counts and the activity feed.

            Two gates, and they answer different questions. The API decides
            whether there is anything to say at all (module hired, permission
            held, a single company to summarise) and sends null when there is
            not. `canReachCard` decides whether THIS tab may show it, and it
            reads the auth store, which the socket refreshes — so a permission
            revoked while the page is open makes the block disappear without a
            reload, exactly like the cards above.
          */}
          {deliveryOperation && canReachCard("deliveries") && (
            <OperationPanel operation={deliveryOperation} basePath={basePath} />
          )}

          {/* Recent Activity Table */}
          {/* A Card is not a table — the table it contains is. */}
          <Card className="shadow-md mt-6" data-tutorial="recent-activity">
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
                            {displayValue(
                              activity.business?.corporate_reason ??
                                activity.tenantName,
                            )}
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
          {visibleQuickLinks.length > 0 && (
            <div
              className="grid grid-cols-2 gap-3
              sm:gap-4 md:grid-cols-4 mt-6"
              data-quick-links
              data-tutorial="quick-links"
            >
              {visibleQuickLinks.map((link) => (
                <QuickLinkCard
                  key={link.type}
                  title={link.title}
                  icon={link.icon}
                  href={`${basePath}/${link.path}`}
                  color={link.color}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { OverviewDashboard };
