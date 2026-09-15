"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import {
  Loader,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Trash2,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  deleteWebhookEndpoint,
  listWebhookEndpoints,
  type WebhookEndpointRow,
} from "@/actions/integration";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { WebhookFormDialog } from "./form-dialog";
import { formatMoment } from "../lib/format";

interface WebhooksPanelProps {
  businessId: string;
}

/**
 * Where a company's events are sent.
 *
 * Two different "off" states, shown as two different things because they are:
 * `is_active` is the customer's switch, and `disabled_at` is OURS, flipped
 * after too many failures in a row. Collapsing them into one badge would leave
 * somebody re-enabling an endpoint over and over without ever learning that we
 * turned it off because their server stopped answering.
 */
const WebhooksPanel = ({ businessId }: WebhooksPanelProps): JSX.Element => {
  const [editing, setEditing] = useState<WebhookEndpointRow | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["integration_webhook_endpoints", businessId],
    () => listWebhookEndpoints(businessId || undefined),
    { refetchOnWindowFocus: false },
  );

  const endpoints = data?.data ?? [];

  const handleDelete = async (endpoint: WebhookEndpointRow) => {
    if (
      !window.confirm(
        `Remover "${endpoint.name}"? O histórico de envios dele vai junto.`,
      )
    ) {
      return;
    }

    setDeletingId(endpoint.id);

    try {
      const result = await deleteWebhookEndpoint(businessId, endpoint.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Um POST assinado por evento. Reenviamos por até seis horas antes de
          desistir de uma tentativa.
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>

          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={!canWrite || !businessId}
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
            Novo endpoint
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((slot) => (
            <Skeleton key={slot} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : endpoints.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center
          rounded-lg border-2 border-dashed"
        >
          <Webhook className="mb-4 h-12 w-12 text-muted-foreground/40" />

          <p className="max-w-md text-center text-sm text-muted-foreground">
            Nenhum endpoint cadastrado. Sem um, o sistema do cliente só fica
            sabendo das entregas quando pergunta.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{endpoint.name}</span>

                    {endpoint.disabled_at ? (
                      <Badge variant="destructive" className="gap-1">
                        <PowerOff className="h-3 w-3" />
                        Desligado por falhas
                      </Badge>
                    ) : !endpoint.is_active ? (
                      <Badge variant="secondary">Pausado</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/40 text-emerald-600"
                      >
                        Ativo
                      </Badge>
                    )}
                  </div>

                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {endpoint.url}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {endpoint.topics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="font-mono text-[11px]"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!canWrite}
                    onClick={() => setEditing(endpoint)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remover o endpoint"
                    disabled={!canWrite || deletingId === endpoint.id}
                    onClick={() => handleDelete(endpoint)}
                  >
                    {deletingId === endpoint.id ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <dl
                className="mt-3 grid gap-2 border-t pt-3 text-xs
                text-muted-foreground sm:grid-cols-3"
              >
                <div>
                  <dt className="font-medium">Falhas seguidas</dt>
                  <dd>{endpoint.consecutive_failures}</dd>
                </div>

                <div>
                  <dt className="font-medium">Desligado em</dt>
                  <dd>{formatMoment(endpoint.disabled_at)}</dd>
                </div>

                <div>
                  <dt className="font-medium">Criado em</dt>
                  <dd>{formatMoment(endpoint.created_at)}</dd>
                </div>
              </dl>

              {endpoint.disabled_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Desligamos depois de 20 falhas seguidas. Salvar o endpoint
                  outra vez zera a contagem — é alguém dizendo que consertou.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(isCreating || editing) && businessId && (
        <WebhookFormDialog
          businessId={businessId}
          endpoint={editing}
          isOpen={isCreating || Boolean(editing)}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
};

export { WebhooksPanel };
