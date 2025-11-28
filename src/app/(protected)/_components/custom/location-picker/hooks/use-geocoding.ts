import { useQuery } from "react-query";
import { NominatimSearchResult, ReverseGeocodingResult } from "../dto";

// 🔍 Forward Geocoding: Address → Coordinates
const fetchAddressSearch = async (
  query: string,
): Promise<NominatimSearchResult[]> => {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Best query format for exact addresses
  // Ex: "Estrada união indústria 5678 Petrópolis RJ" → more accurate search
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?` +
      `format=json&` +
      `q=${encodeURIComponent(query)}&` +
      `countrycodes=br&` + // Restrict to Brazil only
      `addressdetails=1&` +
      `dedupe=0&` + // It does not deduplicate results (shows all variations).
      `accept-language=pt-BR`,
    {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "TrajettosFleetManager/1.0", // Application identification
      },
    },
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar endereços");
  }

  return response.json();
};

// 🗺️ Reverse Geocoding: Coordinates → Address
const fetchReverseGeocoding = async (
  lat: number,
  lng: number,
): Promise<ReverseGeocodingResult> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?` +
      `format=json&` +
      `lat=${lat}&` +
      `lon=${lng}&` +
      `zoom=18&` +
      `addressdetails=1&` +
      `accept-language=pt-BR`,
    {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Falha ao buscar endereço");
  }

  return response.json();
};

// Hook for Address Search (Forward Geocoding)
const useAddressSearch = (query: string) => {
  return useQuery<NominatimSearchResult[], Error>(
    ["address-search", query],
    () => fetchAddressSearch(query),
    {
      enabled: query.trim().length >= 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  );
};

// Hook for Reverse Geocoding
const useReverseGeocoding = (lat: number | null, lng: number | null) => {
  return useQuery<ReverseGeocodingResult, Error>(
    ["reverse-geocoding", lat, lng],
    () => fetchReverseGeocoding(lat!, lng!),
    {
      // Only fetch if coordinates are valid (not null and not 0)
      enabled: lat !== null && lng !== null && lat !== 0 && lng !== 0,
      staleTime: 10 * 60 * 1000, // 10 minutes - addresses don't change often
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  );
};

export type { NominatimSearchResult, ReverseGeocodingResult };
export { useAddressSearch, useReverseGeocoding };
