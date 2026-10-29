import type { ChatHistoryFilter } from "./types";

/**
 * What a narrowed conversation means, in one place (decisions 6.7 and 14.5):
 * the query each window load adds, which live arrivals belong on screen, and
 * how the banner and the empty state name it. The pane used to spell the
 * delivery/route split inline in four places; a third kind (the ticket) is
 * exactly how such copies drift.
 */

/** What every window load adds to stay inside the filter. */
function filterQueryOf(filter: ChatHistoryFilter | null): {
  deliveryId?: string;
  routeId?: string;
  ticketId?: string;
} {
  if (!filter) return {};

  if (filter.kind === "delivery") return { deliveryId: filter.id };
  if (filter.kind === "route") return { routeId: filter.id };

  return { ticketId: filter.id };
}

/** Whether a message arriving live belongs to the narrowed history. */
function messageMatchesFilter(
  filter: ChatHistoryFilter | null,
  message: {
    deliveryId: string | null;
    routeId?: string | null;
    ticketId?: string | null;
  },
): boolean {
  if (!filter) return true;

  if (filter.kind === "delivery") return message.deliveryId === filter.id;
  if (filter.kind === "route") return (message.routeId ?? null) === filter.id;

  return (message.ticketId ?? null) === filter.id;
}

/** "da entrega de Mercado Sol" / "da Rota 12" / "do atendimento #128". */
function filterSubjectText(filter: ChatHistoryFilter): string {
  if (filter.kind === "delivery") return `da entrega de ${filter.label}`;
  if (filter.kind === "route") return `da ${filter.label}`;

  return `do atendimento ${filter.label}`;
}

/** The empty state's "sobre …". */
function filterAboutText(filter: ChatHistoryFilter): string {
  if (filter.kind === "delivery") return `a entrega de ${filter.label}`;
  if (filter.kind === "route") return `a ${filter.label}`;

  return `o atendimento ${filter.label}`;
}

/** The ticket a message written now goes into, when the pane is one. */
function ticketIdOf(filter: ChatHistoryFilter | null): string | null {
  return filter?.kind === "ticket" ? filter.id : null;
}

export {
  filterQueryOf,
  messageMatchesFilter,
  filterSubjectText,
  filterAboutText,
  ticketIdOf,
};
