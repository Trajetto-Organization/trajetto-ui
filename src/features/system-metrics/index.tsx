"use client";

import {
  Activity,
  BrainCircuit,
  Cpu,
  Database,
  Gauge,
  Loader,
  Radio,
  Send,
  Webhook,
  Workflow,
} from "lucide-react";

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

import { formatNotificationDate } from "@/lib/format-values";

import { ProviderReadinessCard } from "./provider-readiness-card";
import { useHealthMetrics } from "./reads";
import {
  TONE_BADGE_CLASS,
  providerChannelStatus,
  redisStatus,
  worstStatus,
  channelWarnings,
  cronAlerts,
  formatAge,
  poolStatus,
  queueStatus,
  stuckWorkers,
  whatsappAfterAcceptance,
} from "./rules";

/** pt-BR names of the notification channels the API reports. */
const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "No app",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  ACTIVITY: "Atividade",
  PUSH: "Push",
};

/** pt-BR names of the provider channels on /health/metrics → providers. */
const PROVIDER_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  PUSH: "Push",
  AI_OCR: "Leitura de fotos (IA)",
  WEBHOOK: "Webhooks de clientes",
};

const formatMs = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Math.round(value)} ms`;

/**
 * Infrastructure posture for the master: the numbers that say *when* to add
 * capacity, so the decision is arithmetic instead of opinion. On demand and
 * without history. The queue badge reads the worst age across the outbox,
 * every delivery channel and the webhooks (rules.ts): the outbox alone was
 * green through a WhatsApp outage, since an event is "published" as soon as
 * it fans out, whatever happens to its deliveries.
 */
const SystemMetrics = (): JSX.Element => {
  // A relay GET beside the providers' (reads.ts): the two leave together,
  // and the page's "Atualizar" on this tab refetches just them
  // (refreshSystemMetrics). A failed refresh keeps the last numbers.
  const metricsQuery = useHealthMetrics();

  const metrics = metricsQuery.data ?? null;
  const errorMessage =
    metricsQuery.error instanceof Error ? metricsQuery.error.message : null;
  const isLoading = metricsQuery.isFetching;

  const connectionUsage = metrics?.database.connection_usage_percent ?? 0;

  // 70% is where PgBouncer starts paying for itself; 90% is the cliff.
  const connectionBadge =
    connectionUsage >= 90
      ? {
          label: "Crítico",
          className: "bg-red-100 text-red-800 border-red-200",
        }
      : connectionUsage >= 70
        ? {
            label: "Atenção",
            className: "bg-yellow-100 text-yellow-800 border-yellow-200",
          }
        : {
            label: "Saudável",
            className: "bg-green-100 text-green-800 border-green-200",
          };

  // Depth alone lies: a thousand events cleared in a second are fine, ten
  // stuck for an hour are not. The age is measured from creation — the
  // "eligible" lag reads nothing while everything is in backoff.
  const outboxAge =
    metrics?.outbox.oldest_pending_any_seconds ??
    metrics?.outbox.oldest_pending_seconds ??
    null;

  const queueBadge = metrics ? queueStatus(metrics) : null;

  const channels = metrics?.notifications?.channels ?? [];
  const warnedChannels = new Set(
    channelWarnings(channels).map((entry) => entry.channel),
  );

  // Failures and duplicates Meta reported after accepting a WhatsApp: the
  // table cannot show them, both deliveries read "accepted".
  const whatsappReceipts = whatsappAfterAcceptance(metrics?.notifications);
  const channelsWarn =
    warnedChannels.size > 0 || Boolean(whatsappReceipts?.warn);

  const webhooks = metrics?.webhooks;

  const stuck = stuckWorkers(metrics?.workers);
  const lateJobs = cronAlerts(metrics?.cron_jobs);
  const runway = metrics?.driver_position;
  const machineryOk =
    stuck.length === 0 && lateJobs.length === 0 && (runway?.runway_ok ?? true);

  const runtime = metrics?.runtime;
  const pool = runtime?.prisma_pool;
  const poolBadge = poolStatus(pool);

  const providerChannels = metrics?.providers?.channels ?? [];
  const providersBadge = worstStatus(
    providerChannels.map(providerChannelStatus),
  );
  const realtime = metrics?.realtime;
  const redis = metrics?.redis;
  const redisBadge = redisStatus(redis);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Leitura sob demanda da infraestrutura, atualizada pelo botão
          Atualizar. Sem histórico e sem alerta: esta tela mostra o momento; o
          aviso automático de pane fica com o monitoramento externo.
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
                  Expansão de eventos em entregas (outbox)
                </CardDescription>
              </div>
              {queueBadge && (
                <Badge
                  variant="outline"
                  title="Pior idade entre eventos, entregas por canal e webhooks"
                  className={`shrink-0 truncate ${TONE_BADGE_CLASS[queueBadge.tone]}`}
                >
                  {queueBadge.label}
                </Badge>
              )}
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
                <span className="font-medium">{formatAge(outboxAge)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Falhos</span>
                <span
                  className={
                    (metrics?.outbox.failed ?? 0) > 0
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "font-medium"
                  }
                >
                  {metrics?.outbox.failed ?? 0}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                O atraso é o número que importa — profundidade sozinha engana. O
                selo considera também as entregas e os webhooks abaixo.
              </p>
            </CardContent>
          </Card>

          {/* Two columns only from lg: at 768px the sidebar leaves ~400px, and two
              cards there squeezed every label onto three lines. In the two-column
              range this card takes the row, or Entregas por canal (two wide) left
              a hole beside it. */}
          <Card className="shadow-sm hover:shadow-md transition-shadow lg:col-span-2 xl:col-span-1">
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

              {metrics?.ai_pipeline.failed_24h !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Falhas (24h)</span>
                  <span
                    className={
                      metrics.ai_pipeline.failed_24h > 0
                        ? "font-medium text-red-600 dark:text-red-400"
                        : "font-medium"
                    }
                  >
                    {metrics.ai_pipeline.failed_24h}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Análises reservam cota; falhas devolvem o saldo ao período.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Entregas por canal
                </CardTitle>
                <CardDescription>
                  Fila atual de cada canal e falhas das últimas{" "}
                  {metrics?.notifications?.window_hours ?? 24}h
                </CardDescription>
              </div>
              {metrics?.notifications && (
                <Badge
                  variant="outline"
                  className={`shrink-0 truncate ${
                    TONE_BADGE_CLASS[channelsWarn ? "red" : "green"]
                  }`}
                >
                  {channelsWarn ? "Atenção" : "Normal"}
                </Badge>
              )}
            </CardHeader>

            <Separator />

            <CardContent className="pt-4">
              {channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {metrics
                    ? "Esta versão da API não informa as entregas por canal."
                    : "—"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-1 pr-3 font-medium">Canal</th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Pendentes
                        </th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Mais antiga
                        </th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Aceitas pelo provedor (24h)
                        </th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Falhas (24h)
                        </th>
                        <th className="py-1 font-medium text-right">
                          Dead-letter
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((entry) => {
                        const warned = warnedChannels.has(entry.channel);

                        return (
                          <tr
                            key={entry.channel}
                            className={
                              warned
                                ? "text-red-600 dark:text-red-400"
                                : undefined
                            }
                          >
                            <td className="py-1 pr-3 font-medium">
                              {CHANNEL_LABELS[entry.channel] ?? entry.channel}
                              {(entry.processing_lease_expired ?? 0) > 0 && (
                                <span className="ml-1 text-xs">
                                  ({entry.processing_lease_expired} lease
                                  vencido)
                                </span>
                              )}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {entry.pending_total ?? entry.pending}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {formatAge(entry.oldest_pending_seconds)}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {entry.delivered}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {entry.failed}
                            </td>
                            <td className="py-1 text-right">
                              {entry.failed_total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {whatsappReceipts && (
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      WhatsApp aceito pela Meta e depois recusado (24h)
                    </span>
                    <span
                      className={
                        whatsappReceipts.failed > 0
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "font-medium"
                      }
                    >
                      {whatsappReceipts.failed}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Entregas enviadas mais de uma vez ao WhatsApp (24h)
                    </span>
                    <span
                      className={
                        whatsappReceipts.multiSend > 0
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "font-medium"
                      }
                    >
                      {whatsappReceipts.multiSend}
                    </span>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                “Aceitas” é o provedor ter recebido a mensagem, não o
                destinatário. Dead-letter: entregas que esgotaram as tentativas,
                mantidas 30 dias na fila e 90 dias no arquivo.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Eventos enviados aos sistemas dos clientes
                </CardDescription>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4">
              {!webhooks ? (
                <p className="text-sm text-muted-foreground">
                  {metrics
                    ? "Esta versão da API não informa os webhooks."
                    : "—"}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pendentes</span>
                    <span className="font-semibold text-lg">
                      {webhooks.pending_due}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mais antigo</span>
                    <span className="font-medium">
                      {formatAge(webhooks.oldest_due_seconds)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Retidos (endpoint pausado)
                    </span>
                    <span className="font-medium">{webhooks.held}</span>
                  </div>

                  {webhooks.failed_24h !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Falhas (24h)
                      </span>
                      <span
                        className={
                          webhooks.failed_24h > 0
                            ? "font-medium text-red-600 dark:text-red-400"
                            : "font-medium"
                        }
                      >
                        {webhooks.failed_24h}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Endpoints desativados
                    </span>
                    <span
                      className={
                        webhooks.disabled_endpoints > 0
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "font-medium"
                      }
                    >
                      {webhooks.disabled_endpoints}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Workers e rotinas
                </CardTitle>
                <CardDescription>
                  Processos de fundo de todas as réplicas
                </CardDescription>
              </div>
              {metrics?.workers && (
                <Badge
                  variant="outline"
                  className={`shrink-0 truncate ${
                    TONE_BADGE_CLASS[machineryOk ? "green" : "red"]
                  }`}
                >
                  {machineryOk ? "Ativos" : "Atenção"}
                </Badge>
              )}
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4 text-sm">
              {!metrics?.workers ? (
                <p className="text-muted-foreground">
                  {metrics ? "Esta versão da API não informa os workers." : "—"}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Workers ativos
                    </span>
                    <span className="font-medium">
                      {metrics.workers.length - stuck.length} de{" "}
                      {metrics.workers.length}
                    </span>
                  </div>

                  {stuck.map((worker) => (
                    <p
                      key={`${worker.replica}:${worker.worker}`}
                      className="text-red-600 dark:text-red-400"
                    >
                      Travado: {worker.worker} ({worker.replica})
                    </p>
                  ))}

                  {lateJobs.map((job) => (
                    <p key={job.job} className="text-red-600 dark:text-red-400">
                      {job.stale_running > 0
                        ? `Rotina interrompida: ${job.job}`
                        : job.last_status === "FAILED"
                          ? `Rotina falhou: ${job.job}`
                          : `Sem sucesso há mais de 26h: ${job.job}`}
                    </p>
                  ))}

                  {runway && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Partições de rastreio à frente
                      </span>
                      <span
                        className={
                          runway.runway_ok
                            ? "font-medium"
                            : "font-medium text-red-600 dark:text-red-400"
                        }
                      >
                        {runway.partition_runway_days === null
                          ? "—"
                          : `${runway.partition_runway_days} dia(s)`}
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" />
                  Pool desta réplica
                </CardTitle>
                <CardDescription>
                  {runtime
                    ? `Réplica ${runtime.replica}`
                    : "Conexões e processo da API"}
                </CardDescription>
              </div>
              {poolBadge && (
                <Badge
                  variant="outline"
                  className={`shrink-0 truncate ${TONE_BADGE_CLASS[poolBadge.tone]}`}
                >
                  {poolBadge.label}
                </Badge>
              )}
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4 text-sm">
              {!runtime || !pool ? (
                <p className="text-muted-foreground">
                  {metrics ? "Esta versão da API não informa o pool." : "—"}
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Conexões ocupadas
                    </span>
                    <span className="font-semibold text-lg">
                      {pool.busy}
                      <span className="text-muted-foreground font-normal text-sm">
                        {" "}
                        / {pool.limit ?? pool.open}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Esperando conexão
                    </span>
                    <span
                      className={
                        pool.waiting > 0
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "font-medium"
                      }
                    >
                      {pool.waiting}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Event loop (p99)
                    </span>
                    <span className="font-medium">
                      {runtime.event_loop.lag_p99_ms === null
                        ? "—"
                        : `${Math.round(runtime.event_loop.lag_p99_ms)} ms`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Uso do event loop
                    </span>
                    <span className="font-medium">
                      {Math.round(runtime.event_loop.utilization * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Cada réplica tem o seu pool; a leitura é da réplica que
                    respondeu. Espera acima de zero é requisição na fila por
                    conexão.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Beside the pool on purpose: workers, pool and realtime fill one row at xl,
              and the provider calls below get the whole width for their table. */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" />
                  Tempo real e Redis
                </CardTitle>
                <CardDescription>
                  Sockets desta réplica e o Redis
                </CardDescription>
              </div>
              {redisBadge && (
                <Badge
                  variant="outline"
                  className={`shrink-0 truncate ${TONE_BADGE_CLASS[redisBadge.tone]}`}
                >
                  {redisBadge.label}
                </Badge>
              )}
            </CardHeader>

            <Separator />

            <CardContent className="space-y-3 pt-4 text-sm">
              {!realtime && !redis ? (
                <p className="text-muted-foreground">
                  {metrics
                    ? "Esta versão da API não informa o tempo real."
                    : "—"}
                </p>
              ) : (
                <>
                  {realtime && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Sockets conectados
                        </span>
                        <span className="font-semibold text-lg">
                          {realtime.local_connections}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          Entre réplicas
                        </span>
                        <span
                          className={
                            realtime.adapter === "redis" &&
                            realtime.adapter_status === "ready"
                              ? "font-medium"
                              : "font-medium text-red-600 dark:text-red-400"
                          }
                        >
                          {realtime.adapter === "redis"
                            ? realtime.adapter_status === "ready"
                              ? "Redis conectado"
                              : `Redis ${realtime.adapter_status ?? "indisponível"}`
                            : realtime.adapter === "off"
                              ? "Desligado"
                              : "Só local"}
                        </span>
                      </div>
                    </>
                  )}

                  {redis && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Latência do Redis
                        </span>
                        <span className="font-medium">
                          {formatMs(redis.latency_ms)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Memória</span>
                        <span className="font-medium">
                          {redis.used_memory_mb === null
                            ? "—"
                            : `${redis.used_memory_mb} MB${
                                redis.maxmemory_mb !== null
                                  ? ` / ${redis.maxmemory_mb} MB`
                                  : ""
                              }`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Chaves despejadas
                        </span>
                        <span
                          className={
                            (redis.evicted_keys ?? 0) > 0
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "font-medium"
                          }
                        >
                          {redis.evicted_keys ?? "—"}
                        </span>
                      </div>
                    </>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Sem Redis a API segue de pé, mas o rate limit fica local e
                    os eventos não cruzam réplicas.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow col-span-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Chamadas aos provedores
                </CardTitle>
                <CardDescription>
                  Latência e erros desta réplica nos últimos{" "}
                  {metrics?.providers?.window_minutes ?? 15} min
                </CardDescription>
              </div>
              {providersBadge && (
                <Badge
                  variant="outline"
                  className={`shrink-0 truncate ${TONE_BADGE_CLASS[providersBadge.tone]}`}
                >
                  {providersBadge.label}
                </Badge>
              )}
            </CardHeader>

            <Separator />

            <CardContent className="pt-4">
              {providerChannels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {metrics
                    ? "Esta versão da API não informa as chamadas aos provedores."
                    : "—"}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-1 pr-3 font-medium">Provedor</th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Chamadas
                        </th>
                        <th className="py-1 pr-3 font-medium text-right">
                          Erros
                        </th>
                        <th className="py-1 pr-3 font-medium text-right">
                          p95
                        </th>
                        <th className="py-1 font-medium text-right">
                          Último erro
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {providerChannels.map((entry) => {
                        const status = providerChannelStatus(entry);

                        return (
                          <tr
                            key={entry.channel}
                            className={
                              status.tone === "red"
                                ? "text-red-600 dark:text-red-400"
                                : status.tone === "yellow"
                                  ? "text-yellow-700 dark:text-yellow-400"
                                  : undefined
                            }
                          >
                            <td className="py-1 pr-3 font-medium">
                              {PROVIDER_LABELS[entry.channel] ?? entry.channel}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {entry.calls}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {entry.error_rate === null
                                ? "—"
                                : `${entry.errors} (${Math.round(entry.error_rate * 100)}%)`}
                            </td>
                            <td className="py-1 pr-3 text-right">
                              {formatMs(entry.latency_p95_ms)}
                            </td>
                            <td className="py-1 text-right">
                              {entry.last_error_kind ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Só a réplica que respondeu; o log de cada réplica traz o mesmo
                número a cada minuto. O erro aparece como código curto
                (http_401, timeout), nunca a mensagem do provedor.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ProviderReadinessCard />
      </div>

      {metrics && (
        <p className="text-xs text-muted-foreground">
          Leitura de {formatNotificationDate(metrics.timestamp, "pt-BR")}.
        </p>
      )}
    </div>
  );
};

export { SystemMetrics };
