import type { FacetCount } from "@/app/(protected)/_components/shared/tanstack-table/data-table/server-table";

/**
 * What the order-part screens derive from a line and from the list's meta
 * (no directive: server content, client table and tests read it).
 */

/** One listed line, as the API streams it. */
interface OrderPartRow {
  id: string;
  unit_price: number | string;
  quantity: number;
  discount_percentage?: number | string | null;
  businessId: string;
  serviceOrderId: string;
  partId: string;
  created_at: string;
  updated_at: string;
  part: { id: string; description: string; unit_price: number | string };
  business?: { corporate_reason: string } | null;
  serviceOrder: {
    id: string;
    date: string;
    total_amount?: number | string;
    completion_date?: string | null;
    vehicle: { license_plate: string; description: string };
  };
}

interface OrderPartSearchMeta {
  total?: number;
  withDiscount?: number;
  totalValue?: number;
  averageValue?: number;
  facets?: { partId?: FacetCount[] };
}

function numberOf(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;

  const parsed =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

/** Price × quantity and the same with the line's discount, in reais. */
function lineTotals(
  line: Pick<OrderPartRow, "unit_price" | "quantity" | "discount_percentage">,
): {
  gross: number;
  net: number;
} {
  const gross = numberOf(line.unit_price) * line.quantity;
  const net = gross * (1 - numberOf(line.discount_percentage) / 100);

  return {
    gross: Math.round(gross * 100) / 100,
    net: Math.round(net * 100) / 100,
  };
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** The cards, only from the server (decision 8.8), never the page's sums. */
function orderPartStatsData(searchMeta: OrderPartSearchMeta | undefined) {
  return {
    totalItems: searchMeta?.total ?? 0,
    withDiscount: searchMeta?.withDiscount ?? 0,
    totalValue: currency.format(searchMeta?.totalValue ?? 0),
    averageValue: currency.format(searchMeta?.averageValue ?? 0),
  };
}

export {
  lineTotals,
  numberOf,
  orderPartStatsData,
  type OrderPartRow,
  type OrderPartSearchMeta,
};
