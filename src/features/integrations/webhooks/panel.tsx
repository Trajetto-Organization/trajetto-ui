"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import {
  AlertCircle,
  KeyRound,
  Loader,
  Pencil,
  PowerOff,
  RotateCcw,
  Trash2,
  Webhook,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  deleteWebhookEndpoint,
  listWebhookEndpoints,
  reactivateWebhookEndpoint,
  type WebhookEndpointRow,
} from "@/actions/integration";

import { permissions } from "@/lib/permissions";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { WebhookFormDialog } from "./form-dialog";
import { RotateSecretDialog } from "./rotate-secret-dialog";
import { formatMoment } from "../lib/format";
import { MAX_WEBHOOK_ENDPOINTS } from "../lib/webhook-form-schema";

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

  /** The endpoint whose signing secret is being replaced, or none. */
  const [rotating, setRotating] = useState<WebhookEndpointRow | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** The endpoint whose breaker is being switched back on, or none. */
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  /** The endpoint the person is being asked about, or none. */
  const [pendingDelete, setPendingDelete] = useState<WebhookEndpointRow | null>(
    null,
  );

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, refetch } = useQuery(
    ["integration_webhook_endpoints", businessId],
    async () => {
      const answer = await listWebhookEndpoints(businessId || undefined);

      if (isStaleActionResult(answer, { background: true })) {
        throw new Error(STALE_ACTION_MESSAGE);
      }

      return answer;
    },
    { refetchOnWindowFocus: false },
  );

  const endpoints = data?.data ?? [];

  /**
   * Our breaker, switched back on — and nothing else (decision 2.5, CRIT-24).
   *
   * Saving the endpoint unchanged used to be the only way, which the rule
   * that Salvar stays disabled on an untouched form took away. The API sends
   * what the endpoint held, within the replay window.
   */
  const handleReactivate = async (endpoint: WebhookEndpointRow) => {
    setReactivatingId(endpoint.id);

    try {
      const result = await reactivateWebhookEndpoint(businessId, endpoint.id);

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refetch();
    } finally {
      setReactivatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setDeletingId(pendingDelete.id);

    try {
      const result = await deleteWebhookEndpoint(businessId, pendingDelete.id);

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      // Closed only once the work is done, so the pending state stays on
      // screen while the request is in flight.
      setPendingDelete(null);

      await refetch();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4" data-tutorial="integrations-webhooks">
      {/*
        The sentence stays; the buttons moved.

        "Atualizar" and "Novo endpoint" now live in the page's top band, beside the
        company selector, where every other action in the product lives. What
        belongs here is the one line explaining what this list IS — a person
        meeting the screen for the first time reads it once and never again,
        which is exactly what a caption is for and exactly what a button is
        not.
      */}
      <p className="text-sm text-muted-foreground">
        Um POST assinado por evento. Reenviamos por cerca de sete horas antes de
        desistir de uma tentativa. Até {MAX_WEBHOOK_ENDPOINTS} endpoints por
        empresa, pausados incluídos.
      </p>

      {isLoading ? (
        <div className="space-y-3" data-tutorial="loading" aria-busy="true">
          {[0, 1].map((slot) => (
            <Skeleton key={slot} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : data && !data.success ? (
        <EmptyState
          icon={AlertCircle}
          title="Não foi possível carregar os endpoints"
          description={data.message}
        />
      ) : endpoints.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="Nenhum endpoint cadastrado"
          description="Sem um, o sistema do cliente só fica sabendo das entregas quando pergunta."
        />
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              data-webhook-endpoint={endpoint.id}
              className="rounded-lg border p-4"
            >
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
                        className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
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

                <div className="flex flex-wrap items-center gap-2">
                  {endpoint.disabled_at && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/*
                            Wrapped: a disabled button fires no pointer
                            events, so the tooltip saying why it is disabled
                            would never open.
                          */}
                          <span className="inline-flex">
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2"
                              disabled={
                                !canWrite || reactivatingId === endpoint.id
                              }
                              onClick={() => handleReactivate(endpoint)}
                            >
                              {reactivatingId === endpoint.id ? (
                                <Loader className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              )}
                              Reativar envios
                            </Button>
                          </span>
                        </TooltipTrigger>

                        {!canWrite && (
                          <TooltipContent className="max-w-sm">
                            <p>{permissionsRequired.tooltipMessage}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!canWrite}
                    title={
                      !canWrite ? permissionsRequired.tooltipMessage : undefined
                    }
                    onClick={() => setEditing(endpoint)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>

                  {/*
                    Replacing a leaked secret used to mean deleting the
                    endpoint and its history. The old one keeps signing for 24
                    hours, so this is safe to press — the dialog says so first.
                  */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!canWrite}
                    title={
                      !canWrite ? permissionsRequired.tooltipMessage : undefined
                    }
                    onClick={() => setRotating(endpoint)}
                  >
                    <KeyRound className="h-4 w-4" />
                    Gerar novo segredo
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Remover o endpoint"
                    disabled={!canWrite || deletingId === endpoint.id}
                    title={
                      !canWrite ? permissionsRequired.tooltipMessage : undefined
                    }
                    onClick={() => setPendingDelete(endpoint)}
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

              {endpoint.disabled_at ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Desligamos depois de 20 falhas seguidas (ou de um 410 ou
                  redirecionamento). Os eventos continuam guardados por até 30
                  dias: quando o sistema de vocês voltar a responder, use
                  &ldquo;Reativar envios&rdquo; — a contagem zera e o que ficou
                  retido é enviado na hora.
                </p>
              ) : !endpoint.is_active ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Pausado por vocês: eventos que acontecem enquanto ele está
                  pausado não são enviados depois. O que já estava na fila fica
                  retido e sai quando o endpoint for ativado na edição (até 30
                  dias).
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/*
        Editing only. Creating an endpoint is the page band's job now, and it
        renders its own copy of this dialog with `endpoint={null}` — the same
        component, opened from the place the rest of the product opens a
        create action from. What is left here is the one that can only be
        opened from a row, because it needs the row.
      */}
      {editing && businessId && (
        <WebhookFormDialog
          businessId={businessId}
          endpoint={editing}
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSaved={() => refetch()}
        />
      )}

      {rotating && businessId && (
        <RotateSecretDialog
          businessId={businessId}
          endpoint={rotating}
          isOpen={Boolean(rotating)}
          onClose={() => setRotating(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDelete(null);
        }}
        title="Remover este destino?"
        description={
          <>
            <p>
              <strong>{pendingDelete?.name}</strong> deixa de receber eventos
              imediatamente.
            </p>
            <p>
              O histórico de envios dele vai junto — é por ali que se responde
              &ldquo;mandamos ou não mandamos?&rdquo; depois.
            </p>
          </>
        }
        confirmLabel="Remover"
        destructive
        isPending={Boolean(deletingId)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export { WebhooksPanel };
