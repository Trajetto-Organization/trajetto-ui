"use client";

import { useCallback, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Loader2 } from "lucide-react";
import { useDashboardData } from "../hooks";

interface ActivityTrend {
  month?: string;
  date?: string;
  vehicles: number;
  drivers: number;
  businesses: number;
  branches: number;
  parts: number;
  suppliers: number;
  serviceOrders: number;
  users: number;
  fines: number;
}

interface ChartAreaInteractiveProps {
  activityTrends: ActivityTrend[];
  userRole?: string;
}

const chartConfig = {
  vehicles: {
    label: "Veículos",
    color: "#3b82f6",
  },
  drivers: {
    label: "Motoristas",
    color: "#10b981",
  },
  businesses: {
    label: "Empresas",
    color: "#8b5cf6",
  },
  branches: {
    label: "Filiais",
    color: "#f97316",
  },
  parts: {
    label: "Peças",
    color: "#ec4899",
  },
  suppliers: {
    label: "Fornecedores",
    color: "#6366f1",
  },
  serviceOrders: {
    label: "Ordens de Serviço",
    color: "#14b8a6",
  },
  users: {
    label: "Usuários",
    color: "#f43f5e",
  },
  fines: {
    label: "Multas",
    color: "#dc2626",
  },
} satisfies ChartConfig;

const ChartArea = ({
  activityTrends,
  userRole,
}: ChartAreaInteractiveProps): JSX.Element => {
  const [timeRange, setTimeRange] = useState<string>("6m");
  const { isLoadingTrends, trendsData, fetchTrendsByPeriod } =
    useDashboardData();

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    async (newRange: string) => {
      setTimeRange(newRange);

      // Fetch new data for daily periods
      if (["7d", "30d"].includes(newRange)) {
        await fetchTrendsByPeriod(newRange);
      }
    },
    [fetchTrendsByPeriod],
  );

  // Determine which data to use
  const displayData = useMemo(() => {
    // If we have trends data for daily periods, use it
    if (trendsData && ["7d", "30d"].includes(timeRange)) {
      return trendsData.activityTrends.map((item) => ({
        ...item,
        month: item.date, // Map date to month for consistency
      }));
    }

    // Otherwise, filter the initial monthly data
    const dataLength = activityTrends.length;
    switch (timeRange) {
      case "3m":
        return activityTrends.slice(-Math.min(3, dataLength));
      case "6m":
        return activityTrends.slice(-Math.min(6, dataLength));
      case "12m":
        return activityTrends.slice(-Math.min(12, dataLength));
      default:
        return activityTrends.slice(-Math.min(6, dataLength));
    }
  }, [activityTrends, timeRange, trendsData]);

  // Determine the title based on period
  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case "7d":
        return "Últimos 7 dias";
      case "30d":
        return "Último mês";
      case "3m":
        return "Últimos 3 meses";
      case "6m":
        return "Últimos 6 meses";
      default:
        return "Últimos 6 meses";
    }
  };

  // Custom component for responsive caption
  const ResponsiveLegend = () => {
    const legendItems = [
      { key: "vehicles", label: "Veículos", color: "#3b82f6" },
      { key: "drivers", label: "Motoristas", color: "#10b981" },
      ...(userRole === "MASTER"
        ? [{ key: "businesses", label: "Empresas", color: "#8b5cf6" }]
        : []),
      { key: "branches", label: "Filiais", color: "#f97316" },
      { key: "parts", label: "Peças", color: "#ec4899" },
      { key: "suppliers", label: "Fornecedores", color: "#6366f1" },
      { key: "serviceOrders", label: "Ordens de Serviço", color: "#14b8a6" },
      ...(userRole === "MASTER" || userRole === "BUSINESS_ADMIN"
        ? [{ key: "users", label: "Usuários", color: "#f43f5e" }]
        : []),
      ...(userRole === "MASTER" || userRole === "BUSINESS_ADMIN"
        ? [{ key: "fines", label: "Multas", color: "#dc2626" }]
        : []),
    ];

    return (
      <div
        className="flex flex-wrap items-center 
        justify-center gap-2 mt-3 px-2 sm:gap-4"
      >
        {legendItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <div
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="pt-0" data-tutorial="area-chart">
      <CardHeader
        className="flex items-center gap-2 
        space-y-0 border-b py-5 sm:flex-row"
      >
        <div className="grid flex-1 gap-1">
          <CardTitle>Tendências de Atividade</CardTitle>
          <CardDescription>
            Evolução de registros no sistema - {getTimeRangeLabel(timeRange)}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger
            className="w-full sm:w-[160px] 
            rounded-lg sm:ml-auto"
            aria-label="Selecionar período"
            disabled={isLoadingTrends}
            data-tutorial="area-chart-time-selector"
          >
            <SelectValue placeholder="Últimos 6 meses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">
              Últimos 7 dias
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Último mês
            </SelectItem>
            <SelectItem value="3m" className="rounded-lg">
              Últimos 3 meses
            </SelectItem>
            <SelectItem value="6m" className="rounded-lg">
              Últimos 6 meses
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoadingTrends ? (
          <div
            className="flex items-center 
            justify-center h-[250px]"
          >
            <Loader2
              className="h-8 w-8 animate-spin 
              text-muted-foreground"
            />
          </div>
        ) : displayData.length > 0 ? (
          <div>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={displayData} className="z-30">
                <defs>
                  <linearGradient id="fillVehicles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillDrivers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="fillBusinesses"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillBranches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillParts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="fillSuppliers"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient
                    id="fillServiceOrders"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillFines" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div
                          className="rounded-lg border bg-background p-3 
                          shadow-md w-fit max-w-[90vw] sm:max-w-[300px]"
                        >
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span
                                className="text-[0.70rem] uppercase 
                                text-muted-foreground"
                              >
                                Período
                              </span>
                              <span
                                className="font-bold 
                                text-muted-foreground"
                              >
                                {label}
                              </span>
                            </div>

                            {payload.map((entry, index) => {
                              const colorMap: Record<string, string> = {
                                vehicles: "#3b82f6",
                                drivers: "#10b981",
                                businesses: "#8b5cf6",
                                branches: "#f97316",
                                parts: "#ec4899",
                                suppliers: "#6366f1",
                                serviceOrders: "#14b8a6",
                                users: "#f43f5e",
                                fines: "#dc2626",
                              };

                              const labelMap: Record<string, string> = {
                                vehicles: "Veículos",
                                drivers: "Motoristas",
                                businesses: "Empresas",
                                branches: "Filiais",
                                parts: "Peças",
                                suppliers: "Fornecedores",
                                serviceOrders: "Ordens de Serviço",
                                users: "Usuários",
                                fines: "Multas",
                              };

                              const color =
                                colorMap[entry.dataKey as string] || "#666";
                              const label =
                                labelMap[entry.dataKey as string] ||
                                entry.dataKey;

                              return (
                                <div key={index} className="flex flex-col">
                                  <span
                                    className="text-[0.70rem] 
                                    uppercase text-muted-foreground"
                                  >
                                    {label}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span
                                      className="font-bold text-sm"
                                      style={{ color }}
                                    >
                                      {entry.value}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  dataKey="vehicles"
                  type="natural"
                  fill="url(#fillVehicles)"
                  stroke="#3b82f6"
                  stackId="a"
                />
                <Area
                  dataKey="drivers"
                  type="natural"
                  fill="url(#fillDrivers)"
                  stroke="#10b981"
                  stackId="a"
                />
                {userRole === "MASTER" && (
                  <Area
                    dataKey="businesses"
                    type="natural"
                    fill="url(#fillBusinesses)"
                    stroke="#8b5cf6"
                    stackId="a"
                  />
                )}
                <Area
                  dataKey="branches"
                  type="natural"
                  fill="url(#fillBranches)"
                  stroke="#f97316"
                  stackId="a"
                />
                <Area
                  dataKey="parts"
                  type="natural"
                  fill="url(#fillParts)"
                  stroke="#ec4899"
                  stackId="a"
                />
                <Area
                  dataKey="suppliers"
                  type="natural"
                  fill="url(#fillSuppliers)"
                  stroke="#6366f1"
                  stackId="a"
                />
                <Area
                  dataKey="serviceOrders"
                  type="natural"
                  fill="url(#fillServiceOrders)"
                  stroke="#14b8a6"
                  stackId="a"
                />
                {(userRole === "MASTER" || userRole === "BUSINESS_ADMIN") && (
                  <Area
                    dataKey="users"
                    type="natural"
                    fill="url(#fillUsers)"
                    stroke="#f43f5e"
                    stackId="a"
                  />
                )}
                {(userRole === "MASTER" || userRole === "BUSINESS_ADMIN") && (
                  <Area
                    dataKey="fines"
                    type="natural"
                    fill="url(#fillFines)"
                    stroke="#dc2626"
                    stackId="a"
                  />
                )}
              </AreaChart>
            </ChartContainer>

            <ResponsiveLegend />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            <p>Nenhum dado disponível para o período selecionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ChartArea };
