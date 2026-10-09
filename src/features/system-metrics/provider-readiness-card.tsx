"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader, PlugZap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  getHealthProviders,
  type ProviderReadinessData,
} from "@/actions/health/get-health-providers";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";
import { formatNotificationDate } from "@/lib/format-values";

import { TONE_BADGE_CLASS, readinessBadge, readinessSummary } from "./rules";

/**
 * "Configurei as variáveis — está funcionando?" (contract §32/§33), answered
 * by the API's read-only probes. The first read takes the API's 30-second
 * cache; "Atualizar" asks for fresh probes. Nothing secret reaches the
 * screen: variable names and states only.
 */
const ProviderReadinessCard = (): JSX.Element => {
  const [data, setData] = useState<ProviderReadinessData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async (refresh: boolean) => {
    setIsLoading(true);

    try {
      const response = await getHealthProviders(refresh);

      if (isStaleActionResult(response, { background: true })) {
        setErrorMessage(STALE_ACTION_MESSAGE);
        return;
      }

      if (response.success && response.data) {
        setData(response.data);
        setErrorMessage(null);
      } else {
        setErrorMessage(response.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const handler = () => void load(true);

    window.addEventListener("data-revalidated", handler);
    return () => window.removeEventListener("data-revalidated", handler);
  }, [load]);

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
        {!data ? (
          <p className="text-sm text-muted-foreground">
            {errorMessage ?? (isLoading ? "Verificando…" : "—")}
          </p>
        ) : (
          <ul className="divide-y">
            {data.providers.map((provider) => {
              const badge = readinessBadge(provider.status);

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
            {data.cached ? " (leitura em cache de até 30 s)" : ""}. O botão
            Atualizar sonda de novo.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export { ProviderReadinessCard };
