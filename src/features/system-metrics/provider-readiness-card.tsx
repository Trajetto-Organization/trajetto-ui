"use client";

import { AlertTriangle, Loader, PlugZap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { formatNotificationDate } from "@/lib/format-values";

import { useProviderReadiness } from "./reads";
import {
  TONE_BADGE_CLASS,
  hasTransientProvider,
  probeNote,
  readinessBadge,
  readinessSummary,
} from "./rules";

/**
 * "Configurei as variáveis — está funcionando?" (contract §32/§33), answered
 * by the API's read-only probes. The first read takes the API's cache (30 s,
 * 5 s when something was unstable); "Atualizar" asks for fresh probes
 * (refreshSystemMetrics), and a transient result is read once more by
 * itself. Nothing secret reaches the screen: variable names and states only.
 */
const ProviderReadinessCard = (): JSX.Element => {
  const { query, recheckPending } = useProviderReadiness();

  const data = query.data ?? null;
  const errorMessage =
    query.error instanceof Error ? query.error.message : null;
  const isLoading = query.isFetching;

  // A refresh that failed keeps the last verdict on screen: said, not hidden.
  const stale = data !== null && query.isError && !isLoading;
  const transient = hasTransientProvider(data);

  const summary = readinessSummary(data?.providers);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow col-span-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" />
            Provedores externos
            {isLoading && (
              <Loader
                aria-label="Verificando provedores"
                className="h-4 w-4 animate-spin text-muted-foreground"
              />
            )}
          </CardTitle>
          <CardDescription>
            O que está configurado e respondendo, sem enviar nada a ninguém
          </CardDescription>
        </div>
        {summary && (
          <Badge
            variant="outline"
            className={`shrink-0 truncate ${TONE_BADGE_CLASS[summary.tone]}`}
          >
            {summary.label}
          </Badge>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {stale && (
          <p
            role="status"
            className="mb-3 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300 break-words"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Não foi possível atualizar agora
              {errorMessage ? ` (${errorMessage.replace(/[.\s]+$/, "")})` : ""}.
              Exibindo a verificação de{" "}
              {formatNotificationDate(data.checked_at, "pt-BR")}, que pode estar
              desatualizada.
            </span>
          </p>
        )}

        {!data ? (
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Verificando…" : (errorMessage ?? "Não verificado.")}
          </p>
        ) : (
          <ul className="divide-y">
            {data.providers.map((provider) => {
              const badge = readinessBadge(provider);
              const note = probeNote(provider);

              return (
                <li
                  key={provider.key}
                  className="space-y-1 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {provider.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {provider.latency_ms !== null && (
                        <span className="text-xs text-muted-foreground">
                          {provider.latency_ms} ms
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${TONE_BADGE_CLASS[badge.tone]}`}
                      >
                        {badge.label}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground break-words">
                    {provider.message}
                  </p>

                  {note && (
                    <p className="text-xs text-muted-foreground">{note}</p>
                  )}

                  {provider.missing_env.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Faltam:{" "}
                      {provider.missing_env.map((name) => (
                        <code
                          key={name}
                          className="mr-1 rounded bg-muted px-1 py-0.5 font-mono text-[11px] break-all"
                        >
                          {name}
                        </code>
                      ))}
                    </p>
                  )}

                  {provider.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="text-xs text-yellow-700 dark:text-yellow-400 break-words"
                    >
                      {warning}
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        )}

        {data && (
          <p className="mt-3 text-xs text-muted-foreground">
            Verificado em {formatNotificationDate(data.checked_at, "pt-BR")}
            {data.cached
              ? ` (leitura em cache de até ${transient ? 5 : 30} s)`
              : ""}
            . O botão Atualizar sonda de novo.
            {recheckPending &&
              " Um resultado pode ser passageiro: nova verificação automática em instantes."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export { ProviderReadinessCard };
