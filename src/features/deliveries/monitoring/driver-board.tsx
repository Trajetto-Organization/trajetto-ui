"use client";

import { useEffect } from "react";
import { useQuery } from "react-query";

import {
  AlertTriangle,
  CheckCircle2,
  IdCard,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/custom/empty-state";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import { getDriverMonitoring } from "@/actions/control-tower";
import { STALE_ACTION_MESSAGE, isStaleActionResult } from "@/lib/action-result";

import {
  TowerRequestError,
  accessErrorOf,
  describeFailure,
  retryTransient,
  unwrapAnswer,
} from "@/features/control-tower/lib/tower-request";
import { useRefetchScheduler } from "@/features/control-tower/lib/refetch-scheduler";

import { driverProgress } from "./lib/progress";

interface DriverBoardProps {
  /** Only on /admin, where a master picks the company. */
  businessId?: string;
  mode: "admin" | "dashboard";
}

/**
 * The monitoring board by driver: who is on the street and what their day
 * produced so far, busiest first.
 *
 * It reads the tower's definition of the day (decision 7.1, DLV-MON-3): the
 * operation summary it used to read counted PENDING of any date as the
 * driver's load, so tomorrow's route sat in today's bar and the numbers never
 * matched the tower's funnel. Live like the route board: any route event
 * rereads it, never two within ten seconds.
 */
const DriverBoard = ({ businessId, mode }: DriverBoardProps): JSX.Element => {
  useOperationsSubscription(businessId);

  const board = useQuery(
    ["driver_monitoring", businessId ?? "session"],
    async () => {
      const answer = await getDriverMonitoring({ businessId });

      if (isStaleActionResult(answer, { background: true })) {
        throw new TowerRequestError(STALE_ACTION_MESSAGE);
      }

      return unwrapAnswer(answer);
    },
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: retryTransient,
    },
  );

  const { refetch } = board;

  const scheduleRefetch = useRefetchScheduler(() => void refetch());

  useEffect(() => {
    let disposed = false;
    let bound: ReturnType<typeof getSocket> = null;

    void (async () => {
      const socket = getSocket() ?? (await initializeSocket());

      if (disposed) return;

      bound = socket;

      // A stop settled, a route left, a status moved by hand: some driver's
      // numbers changed.
      socket.on("routeEvent", scheduleRefetch);
    })().catch(() => undefined);

    const stopResync = onRealtimeResync(scheduleRefetch);

    return () => {
      disposed = true;

      stopResync();
      bound?.off("routeEvent", scheduleRefetch);
    };
  }, [scheduleRefetch]);

  const data = board.data;

  if (!data && board.isError) {
    const refusal = accessErrorOf(board.error);

    if (refusal) {
      return (
        <AccessErrorState
          kind={refusal.kind}
          moduleLabel="Entregas"
          audience={mode === "admin" ? "master" : "company"}
          message={refusal.message}
        />
      );
    }

    const copy = describeFailure(board.error, "o quadro por motorista");

    return (
      <EmptyState
        icon={AlertTriangle}
        size="inline"
        title={copy.title}
        description={copy.description}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const { drivers } = data;

  return (
    <div className="space-y-3">
      {board.isError && (
        <p role="alert" className="text-xs text-amber-700 dark:text-amber-400">
          Não foi possível atualizar agora; mostrando a última leitura.
        </p>
      )}

      <div>
        <p className="text-sm font-medium">
          Carga do dia por motorista ({drivers.length})
        </p>
        <p className="text-xs text-muted-foreground">
          Rotas de hoje, na rua agora e resolvidas hoje — a mesma conta da torre
          de controle.
        </p>
      </div>

      {drivers.length === 0 ? (
        <EmptyState
          icon={Truck}
          size="inline"
          title="Nenhum motorista com carga hoje"
          description="Atribua entregas a uma rota de hoje e o quadro ganha vida."
        />
      ) : (
        <ul className="space-y-2">
          {drivers.map((driver) => {
            const progress = driverProgress(driver);

            return (
              <li
                key={driver.driverId}
                className="rounded-lg border p-4"
                data-driver-row={driver.driverId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="truncate text-sm font-medium">
                      {driver.driverName || "Motorista"}
                    </p>
                    {driver.cnh && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <IdCard className="h-3.5 w-3.5" />
                        CNH: {driver.cnh}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {driver.designated > 0 && (
                      <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                        {driver.designated} designada
                        {driver.designated > 1 ? "s" : ""}
                      </span>
                    )}
                    {driver.inRoute > 0 && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        {driver.inRoute} em rota
                      </span>
                    )}
                    {driver.deliveredToday > 0 && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
                        {driver.deliveredToday} entregue
                        {driver.deliveredToday > 1 ? "s" : ""} hoje
                      </span>
                    )}
                    {driver.failedToday > 0 && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
                        {driver.failedToday} insucesso
                        {driver.failedToday > 1 ? "s" : ""} hoje
                      </span>
                    )}
                  </div>
                </div>

                {/* Resolved (delivered + refused) over the day's load, with
                the delivered share in green and the refused in red. */}
                <div className="mt-3 flex items-center gap-2">
                  <div
                    className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`${progress.completion}% resolvidas, ${progress.deliveredRate}% entregues`}
                  >
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${progress.deliveredRate}%` }}
                    />
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{
                        width: `${Math.max(0, progress.completion - progress.deliveredRate)}%`,
                      }}
                    />
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {progress.resolved} de {progress.total} ·{" "}
                    {progress.completion}%
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

export { DriverBoard };
