/**
 * Which ticket the tickets panel has on screen, for the alert balloon: a
 * message in the conversation the reader is already looking at (window
 * focused) does not pop a card. Module state on purpose — the panel and the
 * balloon live in different subtrees of the layout, and this is a fact about
 * the tab, not about either component.
 */
let openTicketId: string | null = null;

function setOpenTicketId(ticketId: string | null): void {
  openTicketId = ticketId;
}

function getOpenTicketId(): string | null {
  return openTicketId;
}

export { setOpenTicketId, getOpenTicketId };
