import type { BusinessSearchMeta, PlaceCount } from "./server-table";

interface BusinessStatsData {
  totalBusiness: number;
  withErpCode: number;
  topStates: string;
  topCities: string;
}

/** "SP (6), MT (3)", or a dash when there is nothing to name. */
function placesText(places: PlaceCount[] | undefined): string {
  return places?.length
    ? places.map((place) => `${place.value} (${place.count})`).join(", ")
    : "—";
}

/**
 * The cards' numbers, read ONLY from the API's `searchMeta` (decision 8.8).
 * The screen used to take the total from the API and count "Com código
 * ERP", "Por Estado" and "Por Cidade" on the ten rows on screen: they changed
 * on every page turn. No directive: pure, and tested without a DOM.
 */
function businessStatsData(
  searchMeta: BusinessSearchMeta | undefined,
): BusinessStatsData {
  return {
    totalBusiness: searchMeta?.total ?? 0,
    withErpCode: searchMeta?.withErpCode ?? 0,
    topStates: placesText(searchMeta?.topStates),
    topCities: placesText(searchMeta?.topCities),
  };
}

export { businessStatsData, placesText, type BusinessStatsData };
