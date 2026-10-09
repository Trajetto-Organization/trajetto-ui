import type { ChatDeliveryChip, ChatHistoryFilter } from "./types";

/**
 * The chat tab, opened from somewhere else — on a driver, with a delivery in
 * the composer's chip, and optionally with the history already narrowed to
 * that delivery or to a route (decision 6.7).
 *
 * One builder and one reader, so the delivery detail, the route detail and
 * the panel cannot drift on parameter names. The panel consumes the params
 * once and removes them from the URL; the company selector drops them on a
 * switch (they are not in its allowlist).
 */
const CHAT_LINK_PARAMS = [
  "chatDriver",
  "chatDriverName",
  "chatDelivery",
  "chatRecipient",
  "chatRoute",
  "chatRouteCode",
  "chatFilter",

  // Decision 14.5: open this support ticket.
  "ticket",
] as const;

interface ChatLinkTarget {
  driver: { id: string; name: string };

  /** The delivery the conversation is about: the composer's chip. */
  delivery?: { id: string; recipient_name: string };

  /** The route, for a route detail's "Conversas". */
  route?: { id: string; code: number };

  /** Open the history narrowed to the delivery or to the route. */
  filter?: "delivery" | "route";

  /** Open this support ticket (decision 14.5); it wins over the filter. */
  ticket?: { id: string };
}

interface ChatLinkRequest {
  driverId: string;
  driverName: string;
  chip: ChatDeliveryChip | null;
  filter: ChatHistoryFilter | null;
}

/** "Rota 12" — how an operator names a route out loud. */
function routeLabel(code: number | string): string {
  return `Rota ${code}`;
}

/**
 * The query string that opens the chat on `target`, keeping what `current`
 * already carries (the MASTER's `businessId`, above all).
 */
function buildChatSearchParams(
  current: string | URLSearchParams,
  target: ChatLinkTarget,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());

  params.set("tab", "chat");
  params.delete("page");
  params.delete("search");

  for (const name of CHAT_LINK_PARAMS) params.delete(name);

  params.set("chatDriver", target.driver.id);
  params.set("chatDriverName", target.driver.name);

  if (target.delivery) {
    params.set("chatDelivery", target.delivery.id);
    params.set("chatRecipient", target.delivery.recipient_name);
  }

  if (target.route) {
    params.set("chatRoute", target.route.id);
    params.set("chatRouteCode", String(target.route.code));
  }

  // A filter needs the thing it filters by.
  if (
    (target.filter === "delivery" && target.delivery) ||
    (target.filter === "route" && target.route)
  ) {
    params.set("chatFilter", target.filter);
  }

  if (target.ticket) params.set("ticket", target.ticket.id);

  return params;
}

/**
 * The query string that opens one ticket, when the caller knows only the
 * ticket ("Ver conversa" of an occurrence, a balloon card). Same cleanup as
 * the builder above, so a previous link never rides along.
 */
function buildTicketSearchParams(
  current: string | URLSearchParams,
  ticketId: string,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());

  params.set("tab", "chat");
  params.delete("page");
  params.delete("search");

  for (const name of CHAT_LINK_PARAMS) params.delete(name);

  params.set("ticket", ticketId);

  return params;
}

/** The ticket a link asks for, or null. */
function readTicketLink(params: URLSearchParams): string | null {
  const ticketId = params.get("ticket")?.trim();

  return ticketId ? ticketId : null;
}

/** What the panel does with the params, or null when there is no link. */
function readChatLink(params: URLSearchParams): ChatLinkRequest | null {
  const driverId = params.get("chatDriver");

  if (!driverId) return null;

  const deliveryId = params.get("chatDelivery");
  const recipient = params.get("chatRecipient");
  const routeId = params.get("chatRoute");
  const routeCode = params.get("chatRouteCode");
  const filterKind = params.get("chatFilter");

  const chip: ChatDeliveryChip | null =
    deliveryId && recipient
      ? { id: deliveryId, recipient_name: recipient }
      : null;

  let filter: ChatHistoryFilter | null = null;

  if (filterKind === "delivery" && chip) {
    filter = { kind: "delivery", id: chip.id, label: chip.recipient_name };
  } else if (filterKind === "route" && routeId) {
    filter = {
      kind: "route",
      id: routeId,
      label: routeCode ? routeLabel(routeCode) : "Rota",
    };
  }

  return {
    driverId,
    driverName: params.get("chatDriverName") ?? "Motorista",
    chip,
    filter,
  };
}

/** The URL without the link, once the panel has taken it. */
function withoutChatLink(params: URLSearchParams): URLSearchParams {
  const cleaned = new URLSearchParams(params.toString());

  for (const name of CHAT_LINK_PARAMS) cleaned.delete(name);

  return cleaned;
}

export {
  CHAT_LINK_PARAMS,
  buildChatSearchParams,
  buildTicketSearchParams,
  readTicketLink,
  readChatLink,
  routeLabel,
  withoutChatLink,
};
export type { ChatLinkTarget, ChatLinkRequest };
