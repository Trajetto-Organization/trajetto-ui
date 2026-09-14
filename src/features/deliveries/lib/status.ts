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

export { DELIVERY_STATUS_META, DELIVERY_TRANSITIONS };
export type { DeliveryStatusMeta };
