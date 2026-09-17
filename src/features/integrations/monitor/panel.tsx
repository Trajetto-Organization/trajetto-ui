"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Loader,
  RefreshCw,
  Send,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  listWebhookDeliveries,
  resendWebhookDelivery,
  type WebhookDeliveryRow,
} from "@/actions/integration";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { FilterChips } from "@/components/shared/custom/filter-chips";
import { formatDuration, formatMoment } from "../lib/format";
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  STATUS_TONES,
} from "../lib/status";

interface MonitorPanelProps {
  businessId: string;
}

type DeliveryStatus = WebhookDeliveryRow["status"];

const PAGE_SIZE = 20;

/**
 * What we sent and what their server answered.
 *
 * The first screen anybody opens when a customer says "não recebemos" — so it
 * shows the HTTP status and the first kilobyte of the response body, which is
 * where the reason almost always is. Keeping more would mean storing a page of
 * somebody's HTML error template multiplied by every event of the day.
 */
const MonitorPanel = ({ businessId }: MonitorPanelProps): JSX.Element => {
  const [status, setStatus] = useState<DeliveryStatus | "ALL">("ALL");
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

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["integration_webhook_deliveries", businessId, status, page],
    () =>
      listWebhookDeliveries(page, PAGE_SIZE, {
        status: status === "ALL" ? undefined : status,
        businessId: businessId || undefined,
      }),
    { refetchOnWindowFocus: false, keepPreviousData: true },
  );

  const rows = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const total = data?.data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleResend = async (row: WebhookDeliveryRow) => {
    setResendingId(row.id);

    try {
      const result = await resendWebhookDelivery(businessId, row.id);

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

  const changeStatus = (value: DeliveryStatus | "ALL") => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Entregues", value: meta?.delivered ?? 0 },
          { label: "Falharam", value: meta?.failed ?? 0 },
          { label: "Na fila", value: meta?.pending ?? 0 },
          {
            label: "p95 (24h)",
            value: formatDuration(meta?.p95LatencyMs),
          },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{card.label}</p>

            <p className="mt-1 text-xl font-semibold tabular-nums">
              {typeof card.value === "number"
                ? card.value.toLocaleString("pt-BR")
                : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterChips
          label="Situação dos envios"
          value={status}
          options={STATUS_FILTERS}
          onChange={changeStatus}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((slot) => (
            <Skeleton key={slot} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nada enviado com este filtro"
          description="Trocar o filtro acima mostra o resto. Se nem em “Todos” houver nada, nenhum endpoint recebeu um evento ainda."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;

            return (
              <div key={row.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : row.id)}
                  className="flex w-full flex-wrap items-center gap-3 p-3
                  text-left hover:bg-muted/50"
                >
                  <Badge variant="outline" className={STATUS_TONES[row.status]}>
                    {STATUS_LABELS[row.status]}
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
                    <dl className="grid gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="font-medium">Tentativas</dt>
                        <dd className="text-muted-foreground">{row.attempts}</dd>
                      </div>

                      <div>
                        <dt className="font-medium">Próxima tentativa</dt>
                        <dd className="text-muted-foreground">
                          {formatMoment(row.availableAt)}
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
                        <p className="text-xs text-destructive">{row.lastError}</p>
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
                        onClick={() => handleResend(row)}
                      >
                        {resendingId === row.id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
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
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString("pt-BR")} envios · página {page} de {lastPage}
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
