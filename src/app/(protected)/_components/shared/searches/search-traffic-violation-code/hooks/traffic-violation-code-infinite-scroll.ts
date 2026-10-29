import { useCursorSearch } from "@/hooks/use-cursor-search";

import type { FetchTrafficViolationCodeResult } from "../search-traffic-violation-code.types";

/**
 * The national table of traffic violation codes (the same for every company).
 *
 * `search` is the typed term, filtered by the API (see useCursorSearch).
 */
function useTrafficViolationCodeInfiniteScroll(search?: string) {
  const { items, ...list } = useCursorSearch<
    FetchTrafficViolationCodeResult["data"][number]
  >({
    queryKey: ["traffic_violation_code"],
    path: "/traffic-violation/search-traffic-violation-codes",
    search,
    fallbackError: "Erro ao carregar os códigos de violação de tráfego",
  });

  return { trafficViolationCode: items, ...list };
}

export { useTrafficViolationCodeInfiniteScroll };
