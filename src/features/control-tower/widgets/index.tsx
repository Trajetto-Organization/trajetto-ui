"use client";

import { AlertTriangle, CheckCircle2, Clock, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { ControlTowerData, TowerEvent } from "@/actions/control-tower";

const asNumber = (value: number): string => value.toLocaleString("pt-BR");

const formatMoment = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(
    new Date(value),
  );

/**
 * The funnel, in the order a document moves.
 *
 * Every column is drawn even at zero, because "nenhuma entrega falhou hoje" is
 * the single best thing this screen can say and a funnel that omitted the
 * column would never say it.
 */
const FunnelWidget = ({
  funnel,
}: {
  funnel: ControlTowerData["funnel"];
}): JSX.Element => {
  const peak = Math.max(1, ...funnel.map((entry) => entry.total));

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Documentos de hoje</p>
      </div>

      <div className="mt-3 space-y-2">
        {funnel.map((entry) => (
          <div key={entry.status} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{entry.label}</span>
              <span className="tabular-nums font-medium">
                {asNumber(entry.total)}
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary/70"
                style={{ width: `${Math.round((entry.total / peak) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * How much of the day is done.
 *
 * An insucesso counts as finished: a bar that only counted successes would sit
 * at 80% forever on a day where a fifth of the addresses were refused.
 */
const ProgressWidget = ({
  progress,
}: {
  progress: ControlTowerData["progress"];
}): JSX.Element => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium">Finalizadas hoje</p>
    </div>

    <p className="mt-3 text-2xl font-semibold tabular-nums">
      {asNumber(progress.finished)}
      <span className="text-base font-normal text-muted-foreground">
        {" / "}
        {asNumber(progress.total)}
      </span>
    </p>

    <div className="mt-3 h-2 w-full rounded-full bg-muted">
      <div
        className="h-2 rounded-full bg-emerald-500"
        style={{ width: `${progress.rate ?? 0}%` }}
      />
    </div>

    <p className="mt-2 text-xs text-muted-foreground">
      {/* Null and not zero on an empty day: nothing to do is not no progress,
      and an empty bar at six in the morning reads as being behind. */}
      {progress.rate === null
        ? "Nenhum documento na operação hoje"
        : `${progress.rate.toLocaleString("pt-BR")}% do dia concluído`}
    </p>
  </div>
);

/**
 * Whether the trucks left when they were supposed to.
 *
 * Four numbers and not one: "sem horário planejado" and "no horário" are
 * different facts, and collapsing them would let an operation that plans no
 * departures score a perfect record.
 */
const PunctualityWidget = ({
  punctuality,
}: {
  punctuality: ControlTowerData["punctuality"];
}): JSX.Element => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium">Pontualidade de saída</p>
    </div>

    <p className="mt-3 text-2xl font-semibold tabular-nums">
      {punctuality.rate === null
        ? "—"
        : `${punctuality.rate.toLocaleString("pt-BR")}%`}
    </p>

    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
      <div>
        <dt>No horário</dt>
        <dd className="font-medium text-foreground">
          {asNumber(punctuality.onTime)}
        </dd>
      </div>

      <div>
        <dt>Atrasadas</dt>
        <dd
          className={`font-medium ${
            punctuality.late > 0 ? "text-amber-600" : "text-foreground"
          }`}
        >
          {asNumber(punctuality.late)}
        </dd>
      </div>

      <div>
        <dt>Não saíram</dt>
        <dd className="font-medium text-foreground">
          {asNumber(punctuality.notDeparted)}
        </dd>
      </div>

      <div>
        <dt>Sem horário</dt>
        <dd className="font-medium text-foreground">
          {asNumber(punctuality.notPlanned)}
        </dd>
      </div>
    </dl>

    {punctuality.rate === null && (
      <p className="mt-2 text-xs text-muted-foreground">
        Nenhuma rota com horário planejado hoje. Sem plano não há atraso a
        medir.
      </p>
    )}
  </div>
);

const EVENT_LABELS: Record<string, string> = {
  ARRIVAL: "Chegada",
  PROOF: "Comprovação",
  STATUS_CHANGE: "Status alterado",
  NOTE: "Anotação",
};

const ACTOR_LABELS: Record<string, string> = {
  USER: "painel",
  DRIVER_APP: "app",
  INTEGRATION: "integração",
  SYSTEM: "sistema",
};

/** What just happened, newest first. */
const EventsWidget = ({ events }: { events: TowerEvent[] }): JSX.Element => (
  <div className="rounded-lg border p-4">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium">Últimos eventos</p>
    </div>

    {events.length === 0 ? (
      <p className="mt-3 text-xs text-muted-foreground">
        Nada registrado ainda hoje.
      </p>
    ) : (
      <ul className="mt-3 space-y-2">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-2 text-xs">
            <span className="tabular-nums text-muted-foreground">
              {formatMoment(event.occurredAt)}
            </span>

            <span className="min-w-0 flex-1">
              <span className="font-medium">
                {EVENT_LABELS[event.type] ?? event.type}
              </span>

              {event.recipientName && (
                <span className="text-muted-foreground">
                  {" · "}
                  {event.recipientName}
                </span>
              )}

              {event.driverName && (
                <span className="text-muted-foreground">
                  {" · "}
                  {event.driverName}
                </span>
              )}
            </span>

            <Badge variant="secondary" className="text-[10px]">
              {ACTOR_LABELS[event.actor] ?? event.actor}
            </Badge>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export { EventsWidget, FunnelWidget, ProgressWidget, PunctualityWidget };
