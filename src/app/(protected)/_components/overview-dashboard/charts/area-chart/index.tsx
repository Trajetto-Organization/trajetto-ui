"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { SvgChart } from "@/components/ui/svg-chart";
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

  /**
   * Only the series this user may see AND the data actually carries.
   *
   * The role filter was always here. The second half is new and is what the
   * deliveries series needs: the API leaves `deliveries` and `routes` out
   * entirely for a company that did not hire the module, and a line drawn
   * from `undefined` renders as a legend entry with nothing under it — a
   * chart claiming a metric exists and then showing a gap.
   *
   * With no points at all (still loading, or a brand-new company) the role
   * filter alone decides, because "the data does not carry it" cannot be
   * distinguished from "there is no data yet".
   */
  const carriesSeries = (key: string): boolean =>
    displayData.length === 0 ||
    displayData.some(
      (point) => typeof (point as Record<string, unknown>)[key] === "number",
    );

  const visibleMetrics = METRICS.filter(
    (m) => hasPermission(m.roles, userRole) && carriesSeries(m.key),
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
          <SvgChart
            data={displayData}
            series={visibleMetrics.map(({ key, label, color }) => ({
              key,
              label,
              color,
            }))}
            xKey="month"
            variant="area"
            height={250}
          />
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
