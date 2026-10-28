"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { AlertCircle, ArrowDownUp } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { FilterChips } from "@/components/shared/custom/filter-chips";
import { RefreshButton } from "@/components/shared/custom/refresh-button";
import { PageActions } from "@/app/(protected)/_components/layout/protected-page-toolbar";
import { usePageActionClassName } from "@/app/(protected)/_components/layout/protected-page-toolbar/page-toolbar-context";
import { useRevalidateScreen } from "@/hooks/use-revalidate-screen";
import { fetchApiUsage } from "../lib/reads";

import { formatDayKey } from "../lib/format";

interface UsagePanelProps {
  businessId: string;
}

/**
 * The window, as chip values.
 *
 * Strings rather than numbers because that is what a group of toggles
 * exchanges; the number is parsed back where the query needs it. "Hoje" is
 * the company's business day (decision 1.1): the API buckets calls by the
 * company's calendar, not by the UTC day (DLVB-33).
 */
const WINDOWS = [
  { value: "1", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
] as const;

const asNumber = (value: number): string => value.toLocaleString("pt-BR");

/**
 * The other direction. The monitor answers "o que mandamos"; this answers "o
 * que eles pediram", which is the question that arrives first.
 *
 * Three columns and not one per status code: a screen with a column for 401,
 * another for 403 and another for 422 is a screen nobody reads. "Funcionou",
 * "o cliente errou" and "nós erramos" are the three conversations that
 * actually happen, and each one goes to a different person.
 */
const UsagePanel = ({ businessId }: UsagePanelProps): JSX.Element => {
  const [days, setDays] = useState<number>(7);

  // The tab's refresh, like every "Atualizar" (decision 2.1).
  const { revalidate, isRevalidating } = useRevalidateScreen();
  const actionClassName = usePageActionClassName();

  const { data, isLoading, isFetching } = useQuery(
    ["integration_api_usage", businessId, days],
    // A relay GET (lib/reads), cancelled when the period moves on.
    ({ signal }) =>
      fetchApiUsage(days, { businessId: businessId || undefined }, { signal }),
    {
      refetchOnWindowFocus: false,
      keepPreviousData: true,

      // A live counter: going back to a period asks again rather than
      // showing the numbers from the first visit (DLVB-36).
      staleTime: 0,
    },
  );

  const usage = data?.success ? data.data : undefined;
  const refused = Boolean(data && !data.success);

  const totals = usage?.totals ?? { ok: 0, clientError: 0, serverError: 0 };
  const grandTotal = totals.ok + totals.clientError + totals.serverError;

  const byDay = usage?.byDay ?? [];
  const peak = Math.max(1, ...byDay.map((entry) => entry.total));

  return (
    <div className="space-y-4" data-tutorial="integrations-usage">
      {/* Same as the monitor: the only action here refreshes the cards
          below, so it stays beside the period that scopes them — full width
          with its label on a phone (decision 3.6). */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterChips
          label="Período"
          value={String(days)}
          options={WINDOWS}
          onChange={(value) => setDays(Number(value))}
          className="min-w-0 sm:flex-initial"
        />

        <PageActions className="sm:ml-auto">
          <RefreshButton
            storageKey="integrations-usage"
            isRefreshing={isFetching || isRevalidating}
            className={actionClassName}
            onRefresh={revalidate}
          />
        </PageActions>
      </div>

      {/*
        The totals only exist once the API answered them. Zeros drawn while
        loading, or above a refused read, said "no calls" — the very reading
        the error state below is there to prevent.
      */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3" data-usage-totals="loading">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[4.5rem] w-full rounded-lg" />
          ))}
        </div>
      ) : usage ? (
        <div className="grid gap-3 sm:grid-cols-3" data-usage-totals="">
          {[
            {
              label: "Funcionaram",
              value: totals.ok,
              tone: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "O cliente errou (4xx)",
              value: totals.clientError,
              tone: "text-amber-600",
            },
            {
              label: "Nós erramos (5xx)",
              value: totals.serverError,
              tone: "text-destructive",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{card.label}</p>

              <p
                className={`mt-1 text-xl font-semibold tabular-nums ${card.tone}`}
              >
                {asNumber(card.value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3" data-tutorial="loading" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : refused && data ? (
        // A refusal is not "no calls": that reads as a customer whose ERP
        // stopped talking to us.
        <EmptyState
          icon={AlertCircle}
          title="Não foi possível carregar o uso da API"
          description={data.message}
        />
      ) : grandTotal === 0 ? (
        <EmptyState
          icon={ArrowDownUp}
          title="Nenhuma chamada nesta janela"
          description="Se um sistema deveria estar conversando com o Trajetto, ele não está. Confira a chave dele em Chaves de API."
        />
      ) : (
        <>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Chamadas por dia</p>

            <div
              className="mt-3 flex items-end gap-1"
              role="img"
              aria-label="Chamadas por dia"
            >
              {byDay.map((entry) => (
                <div
                  key={entry.day}
                  className="flex-1"
                  title={`${formatDayKey(entry.day, true)}: ${asNumber(entry.total)} chamadas`}
                >
                  {/* A day with no calls draws a sliver rather than nothing:
                  an empty column has to read as "zero", not as a gap in the
                  chart where a day is missing. */}
                  <div
                    className="rounded-sm bg-primary/70"
                    style={{
                      height: `${Math.max(
                        2,
                        Math.round((entry.total / peak) * 96),
                      )}px`,
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{formatDayKey(byDay[0]?.day)}</span>
              <span>{formatDayKey(byDay[byDay.length - 1]?.day)}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="border-b bg-muted/40">
                <tr className="text-left">
                  <th className="p-3 font-medium">Método</th>
                  <th className="p-3 font-medium">Rota</th>
                  <th className="p-3 text-right font-medium">OK</th>
                  <th className="p-3 text-right font-medium">4xx</th>
                  <th className="p-3 text-right font-medium">5xx</th>
                </tr>
              </thead>

              <tbody>
                {(usage?.byRoute ?? []).map((row) => (
                  <tr
                    key={`${row.method} ${row.route}`}
                    className="border-b last:border-0"
                  >
                    <td className="p-3 font-mono text-xs">{row.method}</td>

                    <td className="p-3 font-mono text-xs">{row.route}</td>

                    <td className="p-3 text-right tabular-nums">
                      {asNumber(row.ok)}
                    </td>

                    <td
                      className={`p-3 text-right tabular-nums ${
                        row.clientError > 0 ? "text-amber-600" : ""
                      }`}
                    >
                      {asNumber(row.clientError)}
                    </td>

                    <td
                      className={`p-3 text-right tabular-nums ${
                        row.serverError > 0 ? "text-destructive" : ""
                      }`}
                    >
                      {asNumber(row.serverError)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            A rota é o padrão, não a URL: <code>/deliveries/:id</code> conta
            todas as consultas a documentos numa linha só. Chamadas recusadas
            por chave inválida não aparecem aqui — sem chave válida não há
            empresa a quem atribuí-las.
          </p>
        </>
      )}

      {/* What "Hoje" means holds for every view, an empty one included —
          which is exactly when somebody wonders whether a call made at
          23:30 counted (DLVB-33). */}
      {!refused && (
        <p
          className="text-xs text-muted-foreground"
          data-usage-calendar-note=""
        >
          Os dias são os dias do calendário da empresa
          {usage?.timeZone ? ` (${usage.timeZone})` : ""}: &ldquo;Hoje&rdquo;
          começa à meia-noite dela.
        </p>
      )}
    </div>
  );
};

export { UsagePanel };
