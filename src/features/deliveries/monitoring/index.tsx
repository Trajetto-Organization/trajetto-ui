"use client";

import { CheckCircle2, IdCard, Truck, UserRound } from "lucide-react";

import { EmptyState } from "@/components/shared/custom/empty-state";

import type { OperationSummaryData } from "../lib/panels";

interface MonitoringPanelProps {
  summary: OperationSummaryData;
}

/**
 * The per-driver board under the day's totals: who is on the street and
 * what their route produced so far. Busiest first — the API already sorts.
 * Live position belongs to the control tower slice; this board answers the
 * dispatcher's question with numbers, refreshed by the standard button.
 */
const MonitoringPanel = ({ summary }: MonitoringPanelProps): JSX.Element => {
  const { drivers } = summary;

  return (
    <div className="space-y-3" data-tutorial="monitoring-board">
      <p className="text-sm font-medium">
        Quadro por motorista ({drivers.length})
      </p>

      {drivers.length === 0 ? (
        <EmptyState
          icon={Truck}
          size="inline"
          title="Nenhum motorista com carga hoje"
          description="Atribua entregas na aba Entregas e o quadro ganha vida."
        />
      ) : (
        <ul className="space-y-2">
          {drivers.map((driver) => {
            const routeSize =
              driver.designated + driver.inRoute + driver.deliveredToday;

            const progress =
              routeSize > 0
                ? Math.round((driver.deliveredToday / routeSize) * 100)
                : 0;

            return (
              <li
                key={driver.driverId}
                className="rounded-lg border p-4"
              >
                <div
                  className="flex flex-wrap items-center justify-between
                  gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium">
                      {driver.driverName || "Motorista"}
                    </p>
                    {driver.cnh && (
                      <span
                        className="flex items-center gap-1 text-xs
                        text-muted-foreground"
                      >
                        <IdCard className="h-3.5 w-3.5" />
                        CNH: {driver.cnh}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {driver.designated > 0 && (
                      <span
                        className="rounded-full bg-violet-100 px-2.5 py-0.5
                        text-xs font-medium text-violet-800"
                      >
                        {driver.designated} designada
                        {driver.designated > 1 ? "s" : ""}
                      </span>
                    )}
                    {driver.inRoute > 0 && (
                      <span
                        className="rounded-full bg-blue-100 px-2.5 py-0.5
                        text-xs font-medium text-blue-800"
                      >
                        {driver.inRoute} em rota
                      </span>
                    )}
                    {driver.deliveredToday > 0 && (
                      <span
                        className="rounded-full bg-green-100 px-2.5 py-0.5
                        text-xs font-medium text-green-800"
                      >
                        {driver.deliveredToday} entregue
                        {driver.deliveredToday > 1 ? "s" : ""} hoje
                      </span>
                    )}
                    {driver.failedToday > 0 && (
                      <span
                        className="rounded-full bg-red-100 px-2.5 py-0.5
                        text-xs font-medium text-red-800"
                      >
                        {driver.failedToday} insucesso
                        {driver.failedToday > 1 ? "s" : ""} hoje
                      </span>
                    )}
                  </div>
                </div>

                {/* Route progress: proven drops over the day's load. */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500
                      transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span
                    className="flex items-center gap-1 text-xs
                    text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {progress}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export { MonitoringPanel };
