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

import { useBarChart } from "./hooks";
import type { ChartBarDefaultProps } from "./bar-chart.types";

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
  const {
    chartData,
    getTimeRangeLabel,
    growthPercentage,
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
                        <section className="grid gap-2">
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
                        </section>
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
