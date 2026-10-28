"use client";

import { Minus, TrendingDown, TrendingUp, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

import { useBarChart } from "./hooks";
import type { ChartBarDefaultProps } from "./bar-chart.types";

const ChartBar = ({ maintenanceCosts }: ChartBarDefaultProps): JSX.Element => {
  const {
    chartData,
    comparison,
    getTimeRangeLabel,
    handleTimeRangeChange,
    isLoadingTrends,
    totalExternal,
    totalInternal,
    timeRange,
  } = useBarChart({ maintenanceCosts });

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
              Últimos 30 dias
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
      <CardContent
        className="flex-1 px-2 
        pt-4 sm:px-6 sm:pt-6"
      >
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
          <SvgChart
            data={chartData}
            series={[
              {
                key: "internal",
                label: "Manutenção Interna",
                color: "#3b82f6",
              },
              {
                key: "external",
                label: "Manutenção Externa",
                color: "#ef4444",
              },
            ]}
            xKey="month"
            variant="bar"
            stacked
            height={240}
            formatValue={(value) =>
              `R$ ${value.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            }
          />
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
        {/* A rise in cost is a warning, a fall is good news — the arrow
            used to be green for a rise (cost-comparison.ts). */}
        <div
          className="flex items-center gap-2 leading-snug font-medium"
          data-cost-trend={comparison.trend}
        >
          <span>{comparison.text}</span>
          {comparison.trend === "up" ? (
            <TrendingUp
              className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
          ) : comparison.trend === "down" ? (
            <TrendingDown
              className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
              aria-hidden="true"
            />
          ) : comparison.trend === "flat" ? (
            <Minus className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : null}
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
