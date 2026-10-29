import type { DeliveryStatus } from "@/actions/delivery/get-delivery";

interface DeliveryStatusMeta {
  label: string;
  badgeClassName: string;
}

const DELIVERY_STATUS_META: Record<DeliveryStatus, DeliveryStatusMeta> = {
  PENDING: {
    label: "Pendente",
    badgeClassName: "bg-slate-100 text-slate-800 border-slate-200",
  },
  IN_TRANSIT: {
    label: "Em rota",
    badgeClassName: "bg-blue-100 text-blue-800 border-blue-200",
  },
  DELIVERED: {
    label: "Entregue",
    badgeClassName: "bg-green-100 text-green-800 border-green-200",
  },
  FAILED: {
    label: "Insucesso",
    badgeClassName: "bg-red-100 text-red-800 border-red-200",
  },
  CANCELLED: {
    label: "Cancelada",
    badgeClassName: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

// Mirror of the API status machine — the UI only offers legal moves; the
// API remains the enforcement point.
const DELIVERY_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "FAILED", "PENDING", "CANCELLED"],
  FAILED: ["PENDING", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Whether the panel may edit the delivery's data. Mirror of the API's
 * isDeliveryEditable: only while the cargo is not moving and the outcome is
 * not proven — pending, or failed and awaiting a redelivery decision.
 */
function isDeliveryEditable(status: DeliveryStatus): boolean {
  return status === "PENDING" || status === "FAILED";
}

/** The API's DeliveryNotEditableError sentence, for the disabled menu item. */
const NOT_EDITABLE_REASON =
  "Esta entrega não pode ser editada no status atual. " +
  "Apenas entregas pendentes ou com insucesso podem ser alteradas.";

/**
 * Why the panel may not move this delivery to IN_TRANSIT, or null (decision
 * 5.4, mirror of the API): "Em rota" is a driver carrying the load on a route
 * that left.
 */
function inTransitBlocker(delivery: {
  driverId?: string | null;
  openRouteStatus?: string | null;
}): string | null {
  if (!delivery.driverId) {
    return "Atribua um motorista antes de colocar a entrega em rota.";
  }

  if (
    delivery.openRouteStatus === "PLANNED" ||
    delivery.openRouteStatus === "RELEASED"
  ) {
    return "Esta entrega está numa rota que ainda não saiu. Inicie a rota para colocá-la em rota.";
  }

  return null;
}

export {
  DELIVERY_STATUS_META,
  DELIVERY_TRANSITIONS,
  NOT_EDITABLE_REASON,
  inTransitBlocker,
  isDeliveryEditable,
};
export type { DeliveryStatusMeta };
