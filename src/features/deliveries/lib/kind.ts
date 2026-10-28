/**
 * What a delivery record is (product meeting of 14/10/2026): an "Entrega",
 * an "Ordem de serviço" — a stop to perform a service at the address, such as
 * collecting returnable baskets, unrelated to the fleet module's service
 * order — or a "Coleta". Same route, same driver, same proof: the kind
 * changes the label, the filter and the proof's title, never the flow.
 *
 * Mirrors trajetto-api src/shared/delivery/delivery-kind.ts. No directive:
 * the schema, the server table and the cells read it.
 */

const DELIVERY_KINDS = ["DELIVERY", "SERVICE_ORDER", "PICKUP"] as const;

type DeliveryKind = (typeof DELIVERY_KINDS)[number];

/**
 * What the form may write. PICKUP stays readable and filterable, but only
 * the spreadsheet's "coleta" creates it: the meeting decided the form offers
 * the two types it needs.
 */
const WRITABLE_DELIVERY_KINDS = ["DELIVERY", "SERVICE_ORDER"] as const;

type WritableDeliveryKind = (typeof WRITABLE_DELIVERY_KINDS)[number];

/** A new record is a delivery unless the dispatcher says otherwise. */
const DEFAULT_DELIVERY_KIND: WritableDeliveryKind = "DELIVERY";

const DELIVERY_KIND_LABELS: Record<DeliveryKind, string> = {
  DELIVERY: "Entrega",
  SERVICE_ORDER: "Ordem de serviço",
  PICKUP: "Coleta",
};

/** The kind of a row; an API older than the field sends none (a delivery). */
function deliveryKindOf(row: { kind?: string | null }): DeliveryKind {
  return (DELIVERY_KINDS as readonly string[]).includes(row.kind ?? "")
    ? (row.kind as DeliveryKind)
    : "DELIVERY";
}

export {
  DEFAULT_DELIVERY_KIND,
  DELIVERY_KINDS,
  DELIVERY_KIND_LABELS,
  WRITABLE_DELIVERY_KINDS,
  deliveryKindOf,
  type DeliveryKind,
  type WritableDeliveryKind,
};
