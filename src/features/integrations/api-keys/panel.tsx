"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import { AlertCircle, KeyRound, Loader, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { revokeApiKey } from "@/actions/integration";
import { isStaleActionResult } from "@/lib/action-result";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { formatMoment } from "../lib/format";
import { apiKeysQueryKey, fetchApiKeys } from "../lib/queries";

interface ApiKeysPanelProps {
  businessId: string;
}

/**
 * The keys a company issued, and the one thing the screen can never do:
 * show one again.
 *
 * Only the prefix is stored, so the list is a list of names and prefixes —
 * which is exactly what somebody needs to answer "which of these is the ERP,
 * and is it still being used?" before they revoke it. `last_used_at` is that
 * second question; a key nobody has used in months is a key nobody will miss.
 */
const ApiKeysPanel = ({ businessId }: ApiKeysPanelProps): JSX.Element => {
  const [revokingId, setRevokingId] = useState<string | null>(null);

  /** The key the person is being asked about, or none. */
  const [pendingRevoke, setPendingRevoke] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, refetch } = useQuery(
    apiKeysQueryKey(businessId),
    ({ signal }) => fetchApiKeys(businessId, signal),
    { refetchOnWindowFocus: false },
  );

  const keys = data?.data ?? [];

  const handleRevoke = async () => {
    if (!pendingRevoke) return;

    setRevokingId(pendingRevoke.id);

    try {
      const result = await revokeApiKey(businessId, pendingRevoke.id);

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);

      // Closed only once the work is done: closing on click would take the
      // pending state off screen while the request was still in flight.
      setPendingRevoke(null);

      await refetch();
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-4" data-tutorial="integrations-api-keys">
      {/*
        The sentence stays; the buttons moved.

        "Atualizar" and "Nova chave" now live in the page's top band, beside the
        company selector, where every other action in the product lives. What
        belongs here is the one line explaining what this list IS — a person
        meeting the screen for the first time reads it once and never again,
        which is exactly what a caption is for and exactly what a button is
        not.
      */}
      <p className="text-sm text-muted-foreground">
        Uma chave por sistema integrado. O segredo aparece uma única vez, na
        emissão.
      </p>

      {/*
        Marked as loading: this is the same request that gates the band's
        buttons (Atualizar, Documentação, Nova chave), so until it answers the
        tour waits for them (6 s, not 1.5 s) and a screen reader hears "busy".
        Unmarked, a slow answer left the tour's "Atualizar" step pointing at
        nothing.
      */}
      {isLoading ? (
        <div className="space-y-3" data-tutorial="loading" aria-busy="true">
          {[0, 1, 2].map((slot) => (
            <Skeleton key={slot} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : data && !data.success ? (
        <EmptyState
          icon={AlertCircle}
          title="Não foi possível carregar as chaves"
          description={data.message}
        />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhuma chave emitida"
          description="Um sistema só conversa com o Trajetto depois que alguém aqui decide o que ele pode ver."
        />
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const isRevoked = Boolean(key.revoked_at);

            return (
              <div
                key={key.id}
                data-api-key={key.id}
                /*
                  A revoked key is dimmed by its BACKGROUND, not by an opacity
                  on the whole card. `opacity-60` faded the muted text under
                  the contrast floor — axe flags the prefix, the labels and the
                  badge — so the row people most need to read carefully, to be
                  sure they are revoking the right thing, was the least legible
                  one on the screen. The badge already says "Revogada".
                */
                className={`rounded-lg border p-4 ${
                  isRevoked ? "bg-muted/40" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{key.name}</span>

                      {isRevoked && (
                        <Badge variant="destructive">Revogada</Badge>
                      )}
                    </div>

                    <code className="block font-mono text-xs text-muted-foreground">
                      {key.prefix}
                      {"…"}
                    </code>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {key.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="secondary"
                          className="font-mono text-[11px]"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {!isRevoked && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!canWrite || revokingId === key.id}
                      title={
                        !canWrite
                          ? permissionsRequired.tooltipMessage
                          : undefined
                      }
                      onClick={() =>
                        setPendingRevoke({ id: key.id, name: key.name })
                      }
                    >
                      {revokingId === key.id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldOff className="h-4 w-4" />
                      )}
                      Revogar
                    </Button>
                  )}
                </div>

                <dl
                  className="mt-3 grid gap-2 border-t pt-3 text-xs
                  text-muted-foreground sm:grid-cols-3"
                >
                  <div>
                    <dt className="font-medium">Último uso</dt>
                    <dd>{formatMoment(key.last_used_at)}</dd>
                  </div>

                  <div>
                    <dt className="font-medium">Limite por minuto</dt>
                    <dd>{key.rate_limit_per_minute}</dd>
                  </div>

                  <div>
                    <dt className="font-medium">Emitida em</dt>
                    <dd>{formatMoment(key.created_at)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        onOpenChange={(open) => {
          if (!open && !revokingId) setPendingRevoke(null);
        }}
        title="Revogar esta chave?"
        description={
          <>
            <p>
              A chave <strong>{pendingRevoke?.name}</strong> deixa de ser
              atendida no mesmo instante. O sistema que a usa começa a receber
              401 na próxima chamada.
            </p>
            <p>
              Ela não é apagada: uma chave que fez chamadas é parte da resposta
              sobre o que aconteceu, e apagá-la levaria a trilha junto.
            </p>
          </>
        }
        confirmLabel="Revogar"
        destructive
        isPending={Boolean(revokingId)}
        onConfirm={handleRevoke}
      />
    </div>
  );
};

export { ApiKeysPanel };
