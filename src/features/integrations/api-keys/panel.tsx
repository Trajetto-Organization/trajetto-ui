"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import { KeyRound, Loader, Plus, RefreshCw, ShieldOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { listApiKeys, revokeApiKey } from "@/actions/integration";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { ApiKeyDialog } from "./create-dialog";
import { formatMoment } from "../lib/format";

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
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.INTEGRATION_MANAGE,
      action: "write",
      label: getPermissionName(permissions.INTEGRATION_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["integration_api_keys", businessId],
    () => listApiKeys(businessId || undefined),
    { refetchOnWindowFocus: false },
  );

  const keys = data?.data ?? [];

  const handleRevoke = async (id: string, name: string) => {
    if (
      !window.confirm(
        `Revogar a chave "${name}"? O sistema que a usa para de ser atendido imediatamente.`,
      )
    ) {
      return;
    }

    setRevokingId(id);

    try {
      const result = await revokeApiKey(businessId, id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      await refetch();
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Uma chave por sistema integrado. O segredo aparece uma única vez, na
          emissão.
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
            Nova chave
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((slot) => (
            <Skeleton key={slot} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center
          rounded-lg border-2 border-dashed"
        >
          <KeyRound className="mb-4 h-12 w-12 text-muted-foreground/40" />

          <p className="max-w-md text-center text-sm text-muted-foreground">
            Nenhuma chave emitida. Um sistema só conversa com o Trajetto depois
            que alguém aqui decide o que ele pode ver.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const isRevoked = Boolean(key.revoked_at);

            return (
              <div
                key={key.id}
                className={`rounded-lg border p-4 ${
                  isRevoked ? "opacity-60" : ""
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
                      onClick={() => handleRevoke(key.id, key.name)}
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

      {isCreating && businessId && (
        <ApiKeyDialog
          businessId={businessId}
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onCreated={() => refetch()}
        />
      )}
    </div>
  );
};

export { ApiKeysPanel };
