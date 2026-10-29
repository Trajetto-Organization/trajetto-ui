/**
 * How the tower words its numbers and events. Pure, so the wording a manager
 * reads is decided by a test rather than by a render.
 */

import type {
  TowerEvent,
  TowerPunctuality,
} from "@/actions/control-tower/types";

/** "YYYY-MM-DD" of an instant in a zone (the company's, for the tower). */
function dayKeyIn(
  instant: string | Date,
  timeZone: string | undefined,
): string {
  const date = typeof instant === "string" ? new Date(instant) : instant;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * The moment of an event: the hour when it is from the tower's day, the date
 * and the hour otherwise (TWR-7). An offline proof synced this morning can be
 * from last night, and "22:10" alone reads as today.
 */
function formatEventMoment(
  occurredAt: string,
  day: string | undefined,
  timeZone: string | undefined,
): string {
  const date = new Date(occurredAt);

  if (Number.isNaN(date.getTime())) return "—";

  const zone = timeZone || undefined;

  const hour = new Intl.DateTimeFormat("pt-BR", {
    timeZone: zone,
    timeStyle: "short",
  }).format(date);

  if (!day || dayKeyIn(date, timeZone) === day) return hour;

  const dayMonth = new Intl.DateTimeFormat("pt-BR", {
    timeZone: zone,
    day: "2-digit",
    month: "2-digit",
  }).format(date);

  return `${dayMonth} ${hour}`;
}

const EVENT_LABELS: Record<string, string> = {
  ARRIVAL: "Chegada",
  PROOF: "Comprovação",
  STATUS_CHANGE: "Status alterado",
  NOTE: "Anotação",
  ON_THE_WAY: "A caminho",
  OCCURRENCE: "Ocorrência",
  ROUTE_STARTED: "Rota iniciada",
  ROUTE_COMPLETED: "Rota concluída",
  ROUTE_CANCELLED: "Rota cancelada",
  // Decision 14.7: planning facts on a delivery. The feed leaves them out
  // today; named here so one never reads as the route's lifecycle.
  ROUTE_ADDED: "Adicionada à rota",
  ROUTE_REMOVED: "Retirada da rota",
};

/** The route's own lifecycle, worded "Rota N iniciada/concluída/cancelada". */
const ROUTE_LIFECYCLE = new Set([
  "ROUTE_STARTED",
  "ROUTE_COMPLETED",
  "ROUTE_CANCELLED",
]);

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_TRANSIT: "Em rota",
  DELIVERED: "Entregue",
  FAILED: "Insucesso",
  CANCELLED: "Cancelada",
};

/** "Insucesso · Cliente ausente", "Status alterado · Entregue", "Rota 12 iniciada". */
function eventTitle(event: TowerEvent): string {
  if (event.type === "OCCURRENCE") {
    const kind = event.failure ? "Insucesso" : "Ocorrência";

    return event.detail ? `${kind} · ${event.detail}` : kind;
  }

  if (event.type === "STATUS_CHANGE" && event.detail) {
    return `Status alterado · ${STATUS_LABELS[event.detail] ?? event.detail}`;
  }

  if (ROUTE_LIFECYCLE.has(event.type) && event.routeCode != null) {
    const verb =
      event.type === "ROUTE_STARTED"
        ? "iniciada"
        : event.type === "ROUTE_COMPLETED"
          ? "concluída"
          : "cancelada";

    return `Rota ${event.routeCode} ${verb}`;
  }

  return EVENT_LABELS[event.type] ?? event.type;
}

const ACTOR_LABELS: Record<string, string> = {
  USER: "painel",
  DRIVER_APP: "app",
  INTEGRATION: "integração",
  SYSTEM: "sistema",
};

function actorLabel(actor: string): string {
  return ACTOR_LABELS[actor] ?? actor;
}

/**
 * The sentence under the punctuality number.
 *
 * "Nenhuma rota com horário planejado" used to show whenever the rate was
 * null — including with five routes planned for 08:00 at 07:00 (TWR-5).
 */
function punctualityNote(punctuality: TowerPunctuality): string | null {
  const judged =
    punctuality.onTime + punctuality.late + punctuality.notDeparted;

  if (judged > 0) return null;

  if (punctuality.waiting > 0) {
    return punctuality.waiting === 1
      ? "Uma rota planejada, ainda antes do horário de saída."
      : `${punctuality.waiting} rotas planejadas, todas ainda antes do horário de saída.`;
  }

  return "Nenhuma rota com horário planejado hoje. Sem plano não há atraso a medir.";
}

/** Where the details of a delivery open, on the surface the tower is on. */
function deliveryHref(
  deliveryId: string,
  mode: "admin" | "dashboard",
  businessId: string | undefined,
): string {
  const params = new URLSearchParams({ tab: "deliveries", search: deliveryId });

  if (mode === "admin" && businessId) params.set("businessId", businessId);

  return `/${mode}/deliveries?${params.toString()}`;
}

/** "12 min", "3 h", "2 dias": how long ago, in the largest unit that reads. */
function elapsed(since: string, now: number): string | null {
  const minutes = Math.max(0, Math.round((now - Date.parse(since)) / 60_000));

  if (Number.isNaN(minutes)) return null;
  if (minutes < 1) return null;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);

  if (hours < 48) return `${hours} h`;

  return `${Math.floor(hours / 24)} dias`;
}

/**
 * The last signal of a running route's phone.
 *
 * The API sends the last point however old (TWR-9 review): only a phone that
 * never reported is "sem posição" outright, and one whose last point is from
 * before the departure has sent nothing on THIS route — said so, with the
 * age of what it did send.
 */
function lastSignalLabel(
  lastSignalAt: string | null,
  startedAt: string | null,
  now: number,
): string {
  if (!lastSignalAt) return "Sem posição desde a saída";

  const age = elapsed(lastSignalAt, now);

  if (startedAt && Date.parse(lastSignalAt) < Date.parse(startedAt)) {
    return age
      ? `Sem posição desde a saída · último sinal há ${age}`
      : "Sem posição desde a saída";
  }

  return age ? `Último sinal há ${age}` : "Último sinal agora";
}

/** "Rio Branco" from "America/Rio_Branco". */
function zoneCity(timeZone: string): string {
  return (timeZone.split("/").pop() ?? timeZone).replace(/_/g, " ");
}

/**
 * The sentence that says whose clock the hours are on, or null when the
 * browser is already on the company's.
 *
 * The tower and the boards show every hour in the COMPANY's zone — its day
 * is what they count — and a master in São Paulo watching a carrier in Rio
 * Branco would otherwise read two clocks on one screen without knowing it.
 */
function companyZoneNote(
  timeZone: string | undefined,
  browserZone: string = new Intl.DateTimeFormat().resolvedOptions().timeZone,
): string | null {
  if (!timeZone || timeZone === browserZone) return null;

  return `Horários no fuso da empresa (${zoneCity(timeZone)})`;
}

export {
  actorLabel,
  companyZoneNote,
  dayKeyIn,
  deliveryHref,
  eventTitle,
  formatEventMoment,
  lastSignalLabel,
  punctualityNote,
};
