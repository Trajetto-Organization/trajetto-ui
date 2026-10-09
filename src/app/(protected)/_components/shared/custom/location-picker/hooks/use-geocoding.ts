import { useEffect, useState } from "react";
import { useQuery } from "react-query";

import {
  SEARCH_DEBOUNCE_MS,
  isSearchableQuery,
  normalizeSearchQuery,
  reverseGeocode,
  searchAddresses,
} from "../geocoding";
import type {
  NominatimSearchResult,
  ReverseGeocodingResult,
} from "../location-picker.types";

/** The value once it stopped changing for `delay` ms. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Forward geocoding of what the user typed. `isPending` covers the debounce
 * window too: without it the list said "Nenhum endereço encontrado" for
 * the half second before the search even started.
 */
const useAddressSearch = (query: string) => {
  const normalized = normalizeSearchQuery(query);
  const debounced = useDebouncedValue(normalized, SEARCH_DEBOUNCE_MS);
  const enabled = isSearchableQuery(debounced);

  const result = useQuery<NominatimSearchResult[], Error>(
    ["address-search", debounced],
    // A newer query cancels the request of the one it replaced.
    ({ signal }) => searchAddresses(debounced, { signal }),
    {
      enabled,
      staleTime: 30 * 60 * 1000,
      cacheTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      // One retry at most: a failing public server is not hammered.
      retry: (failures, error) =>
        failures < 1 && (error as { status?: number }).status !== 429,
    },
  );

  const isDebouncing =
    normalized !== debounced && isSearchableQuery(normalized);

  return {
    results: enabled ? (result.data ?? []) : [],
    isPending: isDebouncing || (enabled && result.isLoading),
    error: enabled && !isDebouncing ? result.error : null,
    retry: () => void result.refetch(),
  };
};

// Hook for Reverse Geocoding
const useReverseGeocoding = (lat: number | null, lng: number | null) => {
  return useQuery<ReverseGeocodingResult, Error>(
    ["reverse-geocoding", lat, lng],
    ({ signal }) => reverseGeocode(lat!, lng!, { signal }),
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
export { useAddressSearch, useDebouncedValue, useReverseGeocoding };
