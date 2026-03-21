"use client";

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
import { useChartArea } from "./hooks";

import type { ChartAreaInteractiveProps } from "./area-chart.types";
import { METRICS } from "./data";

const chartConfig = Object.fromEntries(
  METRICS.map(({ key, label, color }) => [key, { label, color }]),
) satisfies ChartConfig;

// Auxiliary function to verify permission.
const hasPermission = (metricRoles: string[], userRole?: string) => {
  if (!userRole) return false;
  return metricRoles.includes("ALL") || metricRoles.includes(userRole);
};

const ChartArea = ({
  activityTrends,
  userRole,
}: ChartAreaInteractiveProps): JSX.Element => {
  const {
    displayData,
    getTimeRangeLabel,
    handleTimeRangeChange,
    isLoadingTrends,
    timeRange,
  } = useChartArea({ activityTrends });

  // Filter only the metrics that the user can see.
  const visibleMetrics = METRICS.filter((m) =>
    hasPermission(m.roles, userRole),
  );

  const ResponsiveLegend = () => (
    <div
      className="flex flex-wrap items-center 
      justify-center gap-2 mt-3 px-2 sm:gap-4"
    >
      {visibleMetrics.map(({ key, label, color }) => (
        <div
          key={key}
          className="flex items-center 
          gap-1.5 text-xs sm:text-sm"
        >
          <div
            className="w-2.5 h-2.5 sm:w-3 sm:h-3 
            rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-muted-foreground 
            whitespace-nowrap"
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="pt-0" data-tutorial="area-chart">
      <CardHeader
        className="flex items-center 
        gap-2 space-y-0 border-b py-5 sm:flex-row"
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
              <AreaChart data={displayData}>
                <defs>
                  {visibleMetrics.map(({ key, color }) => (
                    <linearGradient
                      key={key}
                      id={`fill${key.charAt(0).toUpperCase() + key.slice(1)}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                    </linearGradient>
                  ))}
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
                  cursor={true}
                  wrapperStyle={{ zIndex: 9999 }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;

                    return (
                      <div
                        className="rounded-lg border bg-background
                        p-3 shadow-md w-fit max-w-[90vw] sm:max-w-[300px]"
                      >
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span
                              className="text-[0.70rem] 
                              uppercase text-muted-foreground"
                            >
                              Período
                            </span>
                            <span className="font-bold text-muted-foreground">
                              {label}
                            </span>
                          </div>
                          {payload.map((entry) => {
                            const metric = visibleMetrics.find(
                              (m) => m.key === entry.dataKey,
                            );

                            if (!metric) return null;
                            return (
                              <div
                                key={entry.dataKey}
                                className="flex flex-col"
                              >
                                <span
                                  className="text-[0.70rem] 
                                  uppercase text-muted-foreground"
                                >
                                  {metric.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: metric.color }}
                                  />
                                  <span
                                    className="font-bold text-sm"
                                    style={{ color: metric.color }}
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
                  }}
                />

                {/* Areas generated automatically */}
                {visibleMetrics.map(({ key, color }) => (
                  <Area
                    key={key}
                    dataKey={key}
                    type="natural"
                    fill={`url(#fill${key.charAt(0).toUpperCase() + key.slice(1)})`}
                    stroke={color}
                    stackId="a"
                  />
                ))}
              </AreaChart>
            </ChartContainer>

            <ResponsiveLegend />
          </div>
        ) : (
          <div
            className="flex items-center justify-center 
            h-[250px] text-muted-foreground"
          >
            <p>Nenhum dado disponível para o período selecionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ChartArea };
