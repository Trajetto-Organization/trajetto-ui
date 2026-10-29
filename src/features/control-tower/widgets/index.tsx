"use client";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Route as RouteIcon,
  SignalLow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type {
  ControlTowerData,
  TowerActiveRoute,
  TowerEvent,
} from "@/actions/control-tower/types";

import {
  actorLabel,
  deliveryHref,
  eventTitle,
  formatEventMoment,
  lastSignalLabel,
  punctualityNote,
} from "../lib/tower-format";

const asNumber = (value: number): string => value.toLocaleString("pt-BR");

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
    <div className="rounded-lg border p-4" data-tutorial="control-tower-funnel">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Documentos de hoje</p>
      </div>

      {/* The same definition the monitoring board uses (decision 7.1). */}
      <p className="mt-1 text-xs text-muted-foreground">
        Com rota hoje, na rua agora ou resolvidos hoje.
      </p>

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
 * How much of the day is done (decision 7.2).
 *
 * An insucesso counts as finished: a bar that only counted successes would sit
 * at 80% forever on a day where a fifth of the addresses were refused.
 */
const ProgressWidget = ({
  progress,
}: {
  progress: ControlTowerData["progress"];
}): JSX.Element => (
  <div className="rounded-lg border p-4" data-tutorial="control-tower-progress">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium">Finalizadas hoje</p>
    </div>

    <p className="mt-1 text-xs text-muted-foreground">
      Entregues, insucessos e canceladas resolvidos hoje.
    </p>

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
 * Whether the trucks left when they were supposed to, judged at this hour.
 *
 * "Aguardando saída" stays out of the rate; "Não saíram" is a route whose
 * hour (plus fifteen minutes) passed in the yard, and it weighs as late.
 */
const PunctualityWidget = ({
  punctuality,
}: {
  punctuality: ControlTowerData["punctuality"];
}): JSX.Element => {
  const note = punctualityNote(punctuality);

  const rows: Array<[string, number, boolean]> = [
    ["No horário", punctuality.onTime, false],
    ["Saíram atrasadas", punctuality.late, true],
    ["Não saíram (atrasadas)", punctuality.notDeparted, true],
    ["Aguardando saída", punctuality.waiting ?? 0, false],
    ["Sem horário", punctuality.notPlanned, false],
  ];

  return (
    <div
      className="rounded-lg border p-4"
      data-tutorial="control-tower-punctuality"
    >
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
        {rows.map(([label, value, warn]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd
              className={`font-medium ${
                warn && value > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground"
              }`}
            >
              {asNumber(value)}
            </dd>
          </div>
        ))}
      </dl>

      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
};

/** What just happened today, newest first. */
const EventsWidget = ({
  events,
  day,
  timeZone,
  mode,
  businessId,
}: {
  events: TowerEvent[];
  day?: string;
  timeZone?: string;
  mode: "admin" | "dashboard";
  businessId?: string;
}): JSX.Element => (
  <div className="rounded-lg border p-4" data-tutorial="control-tower-events">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
      <p className="text-sm font-medium">Últimos eventos de hoje</p>
    </div>

    {events.length === 0 ? (
      <p className="mt-3 text-xs text-muted-foreground">
        Nada registrado hoje ainda.
      </p>
    ) : (
      <ul className="mt-3 space-y-2">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatEventMoment(event.occurredAt, day, timeZone)}
            </span>

            <span className="min-w-0 flex-1 break-words">
              {event.deliveryId ? (
                <Link
                  href={deliveryHref(event.deliveryId, mode, businessId)}
                  className={`font-medium underline-offset-2 hover:underline ${
                    event.failure ? "text-red-700 dark:text-red-400" : ""
                  }`}
                >
                  {eventTitle(event)}
                </Link>
              ) : (
                <span className="font-medium">{eventTitle(event)}</span>
              )}

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

            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {actorLabel(event.actor)}
            </Badge>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/**
 * Every route on the street, with or without a dot (TWR-9).
 *
 * A route whose phone denied the location, is locked in the pocket or has the
 * app closed drew nothing anywhere: "Em rota: 3" beside "1 veículo" with no
 * explanation. Here it is listed, with its progress and its last signal.
 */
const ActiveRoutesWidget = ({
  routes,
  onMap,
  now,
  day,
  timeZone,
}: {
  routes: TowerActiveRoute[];
  onMap: ReadonlySet<string>;
  now: number;
  day?: string;
  timeZone?: string;
}): JSX.Element => {
  const withoutPosition = routes.filter((route) => !onMap.has(route.driverId));

  return (
    <div
      className="rounded-lg border p-4"
      data-tutorial="control-tower-active-routes"
    >
      <div className="flex flex-wrap items-center gap-2">
        <RouteIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          Rotas em andamento ({routes.length})
        </p>

        {withoutPosition.length > 0 && (
          <Badge
            variant="outline"
            className="gap-1 text-amber-700 dark:text-amber-400"
          >
            <SignalLow className="h-3 w-3" />
            {withoutPosition.length} sem posição no mapa
          </Badge>
        )}
      </div>

      {routes.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma rota em andamento agora.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => {
            const missing = !onMap.has(route.driverId);

            return (
              <li
                key={route.routeId}
                className="min-w-0 rounded-md border px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    Rota {route.routeCode}
                    {route.driverName ? ` · ${route.driverName}` : ""}
                  </span>

                  {route.vehiclePlate && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {route.vehiclePlate}
                    </Badge>
                  )}
                </div>

                {(route.destination || route.startedAt) && (
                  <p className="mt-1 truncate text-muted-foreground">
                    {route.destination ? `Destino: ${route.destination}` : ""}
                    {route.destination && route.startedAt ? " · " : ""}
                    {route.startedAt
                      ? `Saiu às ${formatEventMoment(route.startedAt, day, timeZone)}`
                      : ""}
                  </p>
                )}

                <p className="mt-1 text-muted-foreground">
                  {route.progress.resolved} de {route.progress.total} paradas
                  resolvidas
                </p>

                <p
                  className={
                    missing
                      ? "mt-1 font-medium text-amber-700 dark:text-amber-400"
                      : "mt-1 text-muted-foreground"
                  }
                >
                  {/* Off the map: no point in the last 12 h. The API still
                  sends the last one, however old, so "sem posição" is said
                  only of a phone that sent nothing since leaving. */}
                  {lastSignalLabel(route.lastSignalAt, route.startedAt, now)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export {
  ActiveRoutesWidget,
  EventsWidget,
  FunnelWidget,
  ProgressWidget,
  PunctualityWidget,
};
