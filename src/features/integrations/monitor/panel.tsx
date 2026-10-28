"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import {
  Activity,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  resendWebhookDelivery,
  type MonitorStatusFilter,
  type MonitorWindow,
  type WebhookDeliveryRow,
} from "@/actions/integration";

import { permissions } from "@/lib/permissions";
import { isStaleActionResult } from "@/lib/action-result";

import { fetchWebhookDeliveries } from "../lib/reads";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { FilterChips } from "@/components/shared/custom/filter-chips";
import { RefreshButton } from "@/components/shared/custom/refresh-button";
import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";

import { formatDuration, formatMoment } from "../lib/format";
import {
  MONITOR_WINDOWS,
  STATUS_FILTERS,
  STATUS_TONES,
  isStalled,
  monitorCardLabels,
  monitorTotalLabel,
  nextAttemptOf,
  statusLabelOf,
} from "../lib/status";

interface MonitorPanelProps {
  businessId: string;
}

const PAGE_SIZE = 20;

/**
 * What we sent and what their server answered.
 *
 * The first screen anybody opens when a customer says "não recebemos" — so it
 * shows the HTTP status and the first kilobyte of the response body, which is
 * where the reason almost always is.
 *
 * One period for the cards AND the list (DLVB-29): the cards used to cover 24
 * hours while each chip listed the whole retained month, and "Entregues (24h)
 * = 3" sat beside a list of five hundred. Each chip now lists exactly what its
 * card counts; "Na fila" is the whole queue on both (DLVB-28).
 */
const MonitorPanel = ({ businessId }: MonitorPanelProps): JSX.Element => {
  const [status, setStatus] = useState<MonitorStatusFilter | "ALL">("ALL");
  const [period, setPeriod] = useState<MonitorWindow>("24h");
  const [page, setPage] = useState<number>(1);

  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  // The tab's refresh, like every "Atualizar" (decision 2.1).
  const { revalidate, isRevalidating } = useRevalidateScreen();
  const actionClassName = usePageActionClassName();

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["integration_webhook_deliveries", businessId, period, status, page],
    // A relay GET (lib/reads), cancelled when the filter moves on.
    ({ signal }) =>
      fetchWebhookDeliveries(
        page,
        PAGE_SIZE,
        {
          status: status === "ALL" ? undefined : status,
          window: period,
          businessId: businessId || undefined,
        },
        { signal },
      ),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,

      // A live log: going back to a status or page asks again rather than
      // showing the list from the first visit (DLVB-36).
      staleTime: 0,
    },
  );

  const rows = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const total = data?.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const labels = monitorCardLabels(meta?.window ?? period);

  const handleResend = async (row: WebhookDeliveryRow) => {
    setResendingId(row.id);

    try {
      const result = await resendWebhookDelivery(businessId, row.id);

      if (isStaleActionResult(result)) return;

      // Outside the 30-day window the API answers 409 with the sentence, and
      // it is shown as-is: somebody pressing resend on a two-month-old event
      // has to learn why nothing happened.
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refetch();
    } finally {
      setResendingId(null);
    }
  };

  const changeStatus = (value: MonitorStatusFilter | "ALL") => {
    setStatus(value);
    setPage(1);
  };

  const changePeriod = (value: MonitorWindow) => {
    setPeriod(value);
    setPage(1);
  };

  return (
    <div className="space-y-4" data-tutorial="integrations-monitor">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: labels.delivered,
            value: meta?.delivered ?? 0,
            title: "Eventos do período entregues ao sistema de vocês.",
          },
          {
            label: labels.failed,
            value: meta?.failed ?? 0,
            title:
              "Eventos do período que esgotaram as tentativas ou foram recusados.",
          },
          {
            label: labels.pending,
            value: meta?.pending ?? 0,
            title:
              "Tudo o que ainda vai sair — aguardando, em envio ou retido —, de qualquer data.",
          },
          {
            label: labels.p95,
            value: formatDuration(meta?.p95LatencyMs),
            title:
              "95% das entregas bem-sucedidas do período tiveram resposta em até esse tempo.",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border p-3"
            title={card.title}
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>

            <p className="mt-1 text-xl font-semibold tabular-nums">
              {typeof card.value === "number"
                ? card.value.toLocaleString("pt-BR")
                : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* What the numbers mean, said once (DLVB-31): the p95 is a receiver's
          speed, not our queue, and "Na fila" is not bounded by the period. */}
      <p className="text-xs text-muted-foreground">
        p95: o tempo de resposta do sistema de vocês nas entregas bem-sucedidas
        do período — 95% delas foram respondidas em até esse tempo. Não inclui o
        tempo de fila nem as falhas. &ldquo;Na fila&rdquo; é tudo o que ainda
        vai sair, de qualquer data; os demais números e a lista são do período
        escolhido.
      </p>

      {/*
        The refresh stays here, with the numbers it changes: this tab's only
        action refreshes the cards directly above. Full width with its label
        on a phone, like every page action (decision 3.6).
      */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterChips
          label="Situação dos envios"
          value={status}
          options={STATUS_FILTERS}
          onChange={changeStatus}
          className="min-w-0 sm:flex-initial"
        />

        <FilterChips
          label="Período"
          value={period}
          options={MONITOR_WINDOWS}
          onChange={changePeriod}
          className="min-w-0 sm:flex-initial"
        />

        <PageActions className="sm:ml-auto">
          <RefreshButton
            storageKey="integrations-monitor"
            isRefreshing={isFetching || isRevalidating}
            className={actionClassName}
            onRefresh={revalidate}
          />
        </PageActions>
      </div>

      {isLoading ? (
        <div className="space-y-2" data-tutorial="loading" aria-busy="true">
          {[0, 1, 2, 3].map((slot) => (
            <Skeleton key={slot} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : data && !data.success ? (
        <EmptyState
          icon={AlertCircle}
          title="Não foi possível carregar o monitor"
          description={data.message}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nada enviado com este filtro"
          description="Trocar a situação ou o período acima mostra o resto. Se nem em “Todos” e 30 dias houver nada, nenhum endpoint recebeu um evento ainda."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;
            const stalled = isStalled(row);

            return (
              <div key={row.id} className="rounded-lg border">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-3
                  text-left hover:bg-muted/50"
                >
                  <Badge
                    variant="outline"
                    className={
                      stalled ? STATUS_TONES.PENDING : STATUS_TONES[row.status]
                    }
                  >
                    {statusLabelOf(row)}
                  </Badge>

                  <code className="font-mono text-xs font-medium">
                    {row.topic}
                  </code>

                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {row.endpoint?.name ?? "endpoint removido"}
                  </span>

                  <span className="text-xs tabular-nums text-muted-foreground">
                    {row.response_status ?? "—"}
                  </span>

                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatDuration(row.latency_ms)}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {formatMoment(row.created_at)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t p-3">
                    {stalled && (
                      <p className="text-xs text-muted-foreground">
                        A última tentativa foi interrompida antes de terminar (o
                        processo que enviava parou). O envio é retomado
                        automaticamente na próxima passagem da fila; não é
                        preciso reenviar.
                      </p>
                    )}

                    <dl className="grid gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="font-medium">Tentativas</dt>
                        <dd className="text-muted-foreground">
                          {row.attempts}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium">Próxima tentativa</dt>
                        <dd className="text-muted-foreground">
                          {formatMoment(nextAttemptOf(row))}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium">Entregue em</dt>
                        <dd className="text-muted-foreground">
                          {formatMoment(row.deliveredAt)}
                        </dd>
                      </div>
                    </dl>

                    {row.endpoint && (
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {row.endpoint.url}
                      </p>
                    )}

                    {row.lastError && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
                        <p className="text-xs text-destructive">
                          {row.lastError}
                        </p>
                      </div>
                    )}

                    {row.response_body && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">
                          Resposta do servidor (primeiro kB)
                        </p>

                        <pre
                          className="max-h-48 overflow-auto rounded-md border
                          bg-muted p-2 text-[11px]"
                        >
                          {row.response_body}
                        </pre>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!canWrite || resendingId === row.id}
                        title={
                          !canWrite
                            ? permissionsRequired.tooltipMessage
                            : undefined
                        }
                        onClick={() => handleResend(row)}
                      >
                        {resendingId === row.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" aria-hidden="true" />
                        )}
                        Reenviar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-xs text-muted-foreground">
            {monitorTotalLabel(total, meta?.totalCapped)} · página {page} de{" "}
            {lastPage}
            {meta?.totalCapped && (
              <span className="block">
                A lista mostra os mais recentes. Filtre por status ou período
                para ver os demais.
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Página anterior"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Próxima página"
              disabled={page >= lastPage || isFetching}
              onClick={() =>
                setPage((current) => Math.min(lastPage, current + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export { MonitorPanel };
