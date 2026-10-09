import type { ServiceOrderSearchMeta } from "../server-table";

/**
 * The cards' numbers, read only from the API's `searchMeta` (decision 8.8).
 *
 * They used to be `.filter`s over the ten rows of the page: "Ordens
 * Concluídas: 3 (2%)" of a fleet with 150 orders. A missing `searchMeta` (an
 * error, an old API) shows zeros, never the page's count.
 */
interface ServiceOrderStatsData {
  totalServiceOrders: number;
  openOrders: number;
  completedOrders: number;
  totalAmount: string;
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function percentOf(part: number, total: number): string {
  return total > 0 ? `${part} (${Math.round((part / total) * 100)}%)` : "0";
}

function serviceOrderStatsData(
  searchMeta: ServiceOrderSearchMeta | undefined,
): ServiceOrderStatsData {
  return {
    totalServiceOrders: searchMeta?.total ?? 0,
    openOrders: searchMeta?.open ?? 0,
    completedOrders: searchMeta?.completed ?? 0,
    totalAmount: currency.format(searchMeta?.totalAmount ?? 0),
  };
}

export { percentOf, serviceOrderStatsData, type ServiceOrderStatsData };
