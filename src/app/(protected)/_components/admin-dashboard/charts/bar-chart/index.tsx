"use client";

import { Minus, TrendingUp, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

import { useDashboardData } from "../hooks";
import { useCallback, useMemo, useState } from "react";

interface MaintenanceCost {
  month?: string;
  date?: string;
  preventive: number;
  corrective: number;
}

interface ChartBarDefaultProps {
  maintenanceCosts: MaintenanceCost[];
}

const chartConfig = {
  preventive: {
    label: "Manutenção Interna",
    color: "#3b82f6",
  },
  corrective: {
    label: "Manutenção Externa",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const ChartBar = ({ maintenanceCosts }: ChartBarDefaultProps): JSX.Element => {
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
  const displayCosts = useMemo(() => {
    // If we have trends data for daily periods, use it
    if (trendsData && ["7d", "30d"].includes(timeRange)) {
      return trendsData.maintenanceCosts.map((item) => ({
        ...item,
        month: item.date, // Map date to month for consistency
      }));
    }

    // Otherwise, filter the initial monthly data
    const dataLength = maintenanceCosts.length;
    switch (timeRange) {
      case "3m":
        return maintenanceCosts.slice(-Math.min(3, dataLength));
      case "6m":
        return maintenanceCosts.slice(-Math.min(6, dataLength));
      case "12m":
        return maintenanceCosts.slice(-Math.min(12, dataLength));
      default:
        return maintenanceCosts.slice(-Math.min(6, dataLength));
    }
  }, [maintenanceCosts, timeRange, trendsData]);

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

  // Calculate totals for footer based on filtered data
  const totalInternal = displayCosts.reduce(
    (sum, item) => sum + item.preventive,
    0,
  );
  const totalExternal = displayCosts.reduce(
    (sum, item) => sum + item.corrective,
    0,
  );

  // Calculate growth percentage (compare last 2 periods if available)
  const growthPercentage = useMemo(() => {
    if (displayCosts.length < 2) return 0;

    const currentPeriod = displayCosts[displayCosts.length - 1];
    const previousPeriod = displayCosts[displayCosts.length - 2];

    const currentTotal = currentPeriod.preventive + currentPeriod.corrective;
    const previousTotal = previousPeriod.preventive + previousPeriod.corrective;

    if (previousTotal === 0) return 0;

    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }, [displayCosts]);

  // Prepare data for the chart
  const chartData = useMemo(() => {
    return displayCosts.map((item) => ({
      month: item.month || item.date,
      total: item.preventive + item.corrective,
      preventive: item.preventive,
      corrective: item.corrective,
    }));
  }, [displayCosts]);

  return (
    <Card className="flex flex-col" data-tutorial="bar-chart">
      <CardHeader
        className="flex items-center gap-2 
        space-y-0 border-b py-5 sm:flex-row"
      >
        <div className="grid flex-1 gap-1">
          <CardTitle>Custos de Manutenção</CardTitle>
          <CardDescription>
            Distribuição de custos por tipo de manutenção -{" "}
            {getTimeRangeLabel(timeRange)}
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger
            className="w-full sm:w-[160px] 
            rounded-lg sm:ml-auto"
            aria-label="Selecionar período"
            disabled={isLoadingTrends}
            data-tutorial="bar-chart-time-selector"
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
      <CardContent className="flex-1 px-2 pt-4 sm:px-6 sm:pt-6">
        {isLoadingTrends ? (
          <div
            className="flex items-center 
            justify-center h-[240px]"
          >
            <Loader2
              className="h-8 w-8 animate-spin 
              text-muted-foreground"
            />
          </div>
        ) : chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div
                        className="rounded-lg border bg-background 
                        p-3 shadow-md min-w-[220px]"
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

                          <div className="flex flex-col">
                            <span
                              className="text-[0.70rem] uppercase 
                              text-muted-foreground"
                            >
                              Total de Custos
                            </span>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: "#3b82f6" }}
                              />
                              <span
                                className="font-bold"
                                style={{ color: "#3b82f6" }}
                              >
                                R${" "}
                                {Number(data.value).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={8} name="total" />
            </BarChart>
          </ChartContainer>
        ) : (
          <div
            className="flex items-center justify-center 
            h-[240px] text-muted-foreground"
          >
            <p>Nenhum dado de custo disponível para o período selecionado</p>
          </div>
        )}
      </CardContent>
      <CardFooter
        className="flex-col items-start 
        gap-2 text-sm pt-0"
      >
        <div className="flex gap-2 leading-none font-medium">
          {growthPercentage > 0 ? (
            <>
              Aumento de {growthPercentage}% no período
              <TrendingUp className="h-4 w-4 text-green-400" />
            </>
          ) : growthPercentage < 0 ? (
            <>
              Redução de {Math.abs(growthPercentage)}% no período
              <TrendingUp className="h-4 w-4 rotate-180 text-red-400" />
            </>
          ) : (
            <>
              Sem variação no período
              <Minus className="h-4 w-4" />
            </>
          )}
        </div>
        <div
          className="text-muted-foreground 
          leading-none text-xs"
        >
          Total de {chartData.length} períodos • Manutenção Interna: R${" "}
          {totalInternal.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}{" "}
          • Manutenção Externa: R${" "}
          {totalExternal.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
          })}
        </div>
      </CardFooter>
    </Card>
  );
};

export { ChartBar };
