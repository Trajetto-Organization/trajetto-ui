"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { ArrowDownUp, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { listApiUsage } from "@/actions/integration";

interface UsagePanelProps {
  businessId: string;
}

const WINDOWS: Array<{ days: number; label: string }> = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
];

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

  const { data, isLoading, isFetching, refetch } = useQuery(
    ["integration_api_usage", businessId, days],
    () => listApiUsage(days, { businessId: businessId || undefined }),
    { refetchOnWindowFocus: false, keepPreviousData: true },
  );

  const usage = data?.data;

  const totals = usage?.totals ?? { ok: 0, clientError: 0, serverError: 0 };
  const grandTotal = totals.ok + totals.clientError + totals.serverError;

  const peak = Math.max(1, ...(usage?.byDay ?? []).map((entry) => entry.total));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {WINDOWS.map((window) => (
            <Button
              key={window.days}
              type="button"
              size="sm"
              variant={days === window.days ? "default" : "outline"}
              onClick={() => setDays(window.days)}
            >
              {window.label}
            </Button>
          ))}
        </div>

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

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Funcionaram", value: totals.ok, tone: "text-emerald-600" },
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

            <p className={`mt-1 text-xl font-semibold tabular-nums ${card.tone}`}>
              {asNumber(card.value)}
            </p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      ) : grandTotal === 0 ? (
        <div
          className="flex h-64 flex-col items-center justify-center
          rounded-lg border-2 border-dashed"
        >
          <ArrowDownUp className="mb-4 h-12 w-12 text-muted-foreground/40" />

          <p className="max-w-md text-center text-sm text-muted-foreground">
            Nenhuma chamada nesta janela. Se um sistema deveria estar
            conversando com o Trajetto, ele não está.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Chamadas por dia</p>

            <div className="mt-3 flex items-end gap-1" role="img" aria-label="Chamadas por dia">
              {(usage?.byDay ?? []).map((entry) => (
                <div
                  key={entry.day}
                  className="flex-1"
                  title={`${entry.day}: ${asNumber(entry.total)}`}
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
              <span>{usage?.byDay?.[0]?.day ?? ""}</span>
              <span>
                {usage?.byDay?.[(usage?.byDay?.length ?? 1) - 1]?.day ?? ""}
              </span>
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
                  <tr key={`${row.method} ${row.route}`} className="border-b last:border-0">
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
    </div>
  );
};

export { UsagePanel };
