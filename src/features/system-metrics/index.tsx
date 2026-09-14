"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BrainCircuit, Database, Loader } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import {
  getHealthMetrics,
  type HealthMetricsData,
} from "@/actions/health/get-health-metrics";

import { formatNotificationDate } from "@/lib/format-values";

/**
 * Infrastructure posture for the master: the numbers that say *when* to add
 * capacity, so the decision is arithmetic instead of opinion. Deliberately
 * on demand and without history — a time series with alerting is the job of
 * an observability tool, not of the product.
 */
const SystemMetrics = (): JSX.Element => {
  const [metrics, setMetrics] = useState<HealthMetricsData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await getHealthMetrics();

      if (response.success && response.data) {
        setMetrics(response.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(response.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  // The page's "Revalidar Dados" button broadcasts this event; the limits
  // panel already listens to it, and so does this tab.
  useEffect(() => {
    const handler = () => void loadMetrics();

    window.addEventListener("data-revalidated", handler);
    return () => window.removeEventListener("data-revalidated", handler);
  }, [loadMetrics]);

  const connectionUsage = metrics?.database.connection_usage_percent ?? 0;

  // 70% is where PgBouncer starts paying for itself; 90% is the cliff.
  const connectionBadge =
    connectionUsage >= 90
      ? { label: "Crítico", className: "bg-red-100 text-red-800 border-red-200" }
      : connectionUsage >= 70
        ? {
            label: "Atenção",
            className: "bg-yellow-100 text-yellow-800 border-yellow-200",
          }
        : {
            label: "Saudável",
            className: "bg-green-100 text-green-800 border-green-200",
          };

  const lagSeconds = metrics?.outbox.oldest_pending_seconds ?? null;

  // Depth alone lies: a thousand events cleared in a second are fine, ten
  // stuck for an hour are not.
  const lagBadge =
    lagSeconds === null
      ? { label: "Sem fila", className: "bg-green-100 text-green-800 border-green-200" }
      : lagSeconds >= 300
        ? { label: "Atrasado", className: "bg-red-100 text-red-800 border-red-200" }
        : lagSeconds >= 60
          ? {
              label: "Acumulando",
              className: "bg-yellow-100 text-yellow-800 border-yellow-200",
            }
          : {
              label: "Em dia",
              className: "bg-green-100 text-green-800 border-green-200",
            };

  const formatLag = (seconds: number | null): string => {
    if (seconds === null) return "—";
    if (seconds < 60) return `${Math.round(seconds)}s`;

    return `${Math.round(seconds / 60)} min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Leitura sob demanda da infraestrutura, atualizada pelo botão
          Revalidar Dados. Sem histórico: séries temporais com alerta são
          trabalho de ferramenta de observabilidade.
        </p>

        {isLoading && (
          <Loader className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>

      {errorMessage && !metrics ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Conexões do Banco
                </CardTitle>
                <CardDescription>
                  Conexões abertas no Postgres × limite do servidor
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 truncate ${connectionBadge.className}`}
              >
                {connectionBadge.label}
              </Badge>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Em uso</span>
                <span className="font-semibold text-lg">
                  {metrics?.database.active_connections ?? 0}
                  <span className="text-muted-foreground font-normal text-sm">
                    {" "}
                    / {metrics?.database.max_connections ?? 0}
                  </span>
                </span>
              </div>

              <Progress
                value={connectionUsage}
                className="h-2.5"
                indicatorClassName={
                  connectionUsage >= 90
                    ? "bg-red-600"
                    : connectionUsage >= 70
                      ? "bg-yellow-500"
                      : "bg-blue-600"
                }
              />

              <p className="text-xs text-muted-foreground">
                {connectionUsage >= 70
                  ? "Passando de 70% — hora de colocar o PgBouncer na frente."
                  : "Cada réplica da API abre seu próprio pool; some as demais conexões (migrações, Studio, clientes SQL) para prever o teto."}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Fila de Eventos
                </CardTitle>
                <CardDescription>
                  Notificações, webhooks e integrações
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 truncate ${lagBadge.className}`}
              >
                {lagBadge.label}
              </Badge>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Aguardando</span>
                <span className="font-semibold text-lg">
                  {metrics?.outbox.pending ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Evento mais antigo
                </span>
                <span className="font-medium">{formatLag(lagSeconds)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Falhos</span>
                <span
                  className={
                    (metrics?.outbox.failed ?? 0) > 0
                      ? "font-medium text-red-600"
                      : "font-medium"
                  }
                >
                  {metrics?.outbox.failed ?? 0}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                O atraso é o número que importa — profundidade sozinha engana.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  Fila de IA
                </CardTitle>
                <CardDescription>
                  Verificações de odômetro e checklist
                </CardDescription>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Na fila</span>
                <span className="font-semibold text-lg">
                  {metrics?.ai_pipeline.pending ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Em execução</span>
                <span className="font-medium">
                  {metrics?.ai_pipeline.running ?? 0}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Análises reservam cota; falhas devolvem o saldo ao período.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {metrics && (
        <p className="text-xs text-muted-foreground">
          Leitura de {formatNotificationDate(metrics.timestamp, "pt-BR")}.
        </p>
      )}
    </div>
  );
};

export { SystemMetrics };
