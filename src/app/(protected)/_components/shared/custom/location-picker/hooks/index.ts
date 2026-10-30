import { useCallback, useEffect, useRef, useState } from "react";
import { useAddressSearch, useReverseGeocoding } from "./use-geocoding";

import type {
  LocationPickerProps,
  NominatimSearchResult,
} from "../location-picker.types";
import { locationPopupHtml } from "../popup-html";
import {
  LEAFLET_ATTRIBUTION_PREFIX,
  ZOOM_CONTROL_TITLES,
} from "@/lib/leaflet-pt-br";
import { loadPublicConfig } from "@/env/client";

import L from "leaflet";

import { addThemedTileLayer } from "@/features/control-tower/lib/themed-tile-layer";
import "leaflet/dist/leaflet.css";
// The app's map theme, after Leaflet's own sheet.
import "@/features/control-tower/lib/leaflet-theme.css";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];
const BRAZIL_ZOOM = 4;

function useLocationPicker({
  onLocationChange,
  disabled,
  latitude,
  longitude,
  onLoadingChange,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const markerRef = useRef<L.Marker | null>(null);
  const popupRef = useRef<L.Popup | null>(null);

  const [currentLat, setCurrentLat] = useState<number | null>(latitude || null);
  const [currentLng, setCurrentLng] = useState<number | null>(
    longitude || null,
  );

  const [isLoadingGPS, setIsLoadingGPS] = useState<boolean>(false);

  // No tile provider in this environment (decision 7.4): the map still takes
  // clicks and shows the pin, and the screen says why it is blank.
  const [tilesUnavailable, setTilesUnavailable] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 🔄 Sync internal state with props (handles external resets)
  useEffect(() => {
    // If props are null/undefined, clear internal state
    if (latitude === null || latitude === undefined) {
      setCurrentLat(null);

      setSelectedAddress("");
      setSelectedPlaceId("");
    } else {
      setCurrentLat(latitude);
    }

    if (longitude === null || longitude === undefined) {
      setCurrentLng(null);
    } else {
      setCurrentLng(longitude);
    }
  }, [latitude, longitude]);

  // 🔍 Address search states
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

  const [openSearch, setOpenSearch] = useState<boolean>(false);

  // The place picked from the search list. Its own label stays: reverse
  // geocoding a town's centre named a random street there ("Toledo - PR"
  // became "Rua Raimundo Leonardi"), and it cost a second request.
  const [searchPick, setSearchPick] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const isSearchPick =
    searchPick !== null &&
    searchPick.lat === currentLat &&
    searchPick.lng === currentLng;

  // 🎯 React Query Hooks
  const {
    results: searchResults,
    isPending: isSearching,
    error: searchError,
    retry: retrySearch,
  } = useAddressSearch(searchQuery);
  const {
    data: reverseGeoData,
    isFetching: isFetchingAddress, // Use isFetching to show skeleton EVERY time data is being fetched
  } = useReverseGeocoding(
    isSearchPick ? null : currentLat,
    isSearchPick ? null : currentLng,
  );

  // Always show skeleton when fetching (even if data exists in cache)
  const shouldShowSkeleton = isFetchingAddress;

  // 📢 Notify parent component about loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(shouldShowSkeleton);
    }
  }, [shouldShowSkeleton, onLoadingChange]);

  // Helper function to format address from Nominatim data
  const formatAddressFromNominatim = useCallback((addr: any): string => {
    // Guard: If addr is null, undefined, or not an object, return fallback
    if (!addr || typeof addr !== "object") {
      return "Endereço não disponível";
    }

    const addressParts: string[] = [];

    // Add street and number
    if (addr.road) {
      let street = addr.road;
      if (addr.house_number) {
        street += `, ${addr.house_number}`;
      }

      addressParts.push(street);
    }

    // Add neighborhood/suburb
    if (addr.suburb || addr.neighbourhood || addr.quarter) {
      addressParts.push(addr.suburb || addr.neighbourhood || addr.quarter);
    }

    // Add city - try multiple fields for better coverage
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.city_district;

    const state = addr.state || addr.region || addr.state_district;

    if (city && state) {
      addressParts.push(`${city} - ${state}`);
    } else if (city) {
      addressParts.push(city);
    } else if (state) {
      addressParts.push(state);
    }

    // Add postcode (CEP) if available
    if (addr.postcode) {
      addressParts.push(`CEP: ${addr.postcode}`);
    }

    // If no parts found, return a generic message
    if (addressParts.length === 0) {
      return "Localização selecionada";
    }

    return addressParts.join(", ");
  }, []);

  // 📍 Update address when reverse geocoding data is available
  const address = isSearchPick
    ? searchPick.label
    : reverseGeoData
      ? formatAddressFromNominatim(reverseGeoData.address)
      : shouldShowSkeleton
        ? "Carregando endereço..."
        : "Endereço não disponível";

  // 🔄 Auto-update selectedAddress when reverse geocoding completes (for GPS and map clicks)
  useEffect(() => {
    if (reverseGeoData && !isFetchingAddress && !isSearchPick) {
      const formattedAddress = formatAddressFromNominatim(
        reverseGeoData.address,
      );

      setSelectedAddress(formattedAddress);
      setSelectedPlaceId(reverseGeoData.place_id?.toString() || "");
    }
  }, [
    reverseGeoData,
    isFetchingAddress,
    isSearchPick,
    formatAddressFromNominatim,
  ]);

  // Function to generate popup content
  const getPopupContent = useCallback(
    (displayAddress: string, isLoading: boolean = false): string => {
      if (isLoading) {
        return `
        <div style="text-align: center; padding: 8px; min-width: 150px;">
          <strong style="color: #d81b60; display: block; margin-bottom: 5px; font-size: 15px;">Localização</strong>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 8px;">
            <div style="height: 12px; background: #e5e7eb; border-radius: 4px; width: 100%; animation: pulse 1.5s ease-in-out infinite;"></div>
            <div style="height: 12px; background: #e5e7eb; border-radius: 4px; width: 75%; animation: pulse 1.5s ease-in-out infinite;"></div>
          </div>
          <span style="display: block; font-size: 12px; color: #666; margin-top: 8px;">Carregando endereço...</span>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        </div>
      `;
      }

      // Escaped there: Leaflet writes popup content with innerHTML.
      return locationPopupHtml(displayAddress);
    },
    [],
  );

  // Function to add marker with custom invisible icon and popup
  const addMarkerToMap = useCallback(
    (
      map: L.Map,
      lat: number,
      lng: number,
      addressText: string,
      isLoading: boolean = false,
    ) => {
      // Custom invisible icon (visual marker is handled by Framer Motion overlay)
      const customIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative; display:none;"></div>`,
        iconSize: [0, 0],
      });

      // Add invisible marker
      const marker = L.marker([lat, lng], {
        icon: customIcon,
      }).addTo(map);

      markerRef.current = marker;

      // Add popup
      const popup = L.popup({
        closeButton: false,
        offset: [0, -10],
        className: "custom-popup",
        autoClose: false,
        closeOnClick: false,
        closeOnEscapeKey: false,
      })
        .setLatLng([lat, lng])
        .setContent(getPopupContent(addressText, isLoading))
        .openOn(map);

      popupRef.current = popup;
    },
    [getPopupContent],
  );

  // Update popup content when address changes or loading state changes
  useEffect(() => {
    if (popupRef.current && currentLat && currentLng) {
      if (shouldShowSkeleton) {
        popupRef.current.setContent(getPopupContent("", true));
      } else {
        popupRef.current.setContent(getPopupContent(address, false));
      }
    }
  }, [address, currentLat, currentLng, shouldShowSkeleton, getPopupContent]);

  // Initialize map
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !mapRef.current ||
      mapInstanceRef.current
    ) {
      return;
    }

    // Brazil-only product: an empty picker opens on Brazil, not on the
    // Gulf of Guinea at lat/lng 0,0.
    const defaultCenter: [number, number] = BRAZIL_CENTER;
    const center: [number, number] =
      currentLat && currentLng ? [currentLat, currentLng] : defaultCenter;

    const map = L.map(mapRef.current, {
      center: center,
      zoom: currentLat && currentLng ? 15 : BRAZIL_ZOOM,
      minZoom: 2,
      maxZoom: 19,
      // Added below with Portuguese names; the default says "Zoom in".
      zoomControl: false,
      // Every tile provider's terms require a visible credit.
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: !disabled,
    });

    L.control.zoom(ZOOM_CONTROL_TITLES).addTo(map);
    map.attributionControl.setPrefix(LEAFLET_ATTRIBUTION_PREFIX);

    mapInstanceRef.current = map;

    // The same provider as the tower and the route page, read at run time
    // (MAP_TILE_URL; public OSM in development only), never hard-coded here.
    let disposed = false;
    let stopTiles: (() => void) | null = null;

    loadPublicConfig()
      .then(({ mapTiles }) => {
        if (disposed || mapInstanceRef.current !== map) return;

        if (!mapTiles) {
          setTilesUnavailable(true);
          return;
        }

        // Follows the theme live (dark style or the CSS filter).
        stopTiles = addThemedTileLayer(L, map, mapTiles);
      })
      .catch(() => {
        if (!disposed) setTilesUnavailable(true);
      });

    // Add marker if position exists
    if (currentLat && currentLng) {
      addMarkerToMap(map, currentLat, currentLng, address);
    }

    // Handle map clicks
    if (!disabled) {
      map.on("click", function (e) {
        const { lat, lng } = e.latlng;

        setCurrentLat(lat);
        setCurrentLng(lng);

        onLocationChange(lat, lng);
      });
    }

    // Cleanup
    return () => {
      disposed = true;
      stopTiles?.();

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;

        markerRef.current = null;
        popupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Update marker and map view when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && currentLat && currentLng) {
      if (markerRef.current && popupRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        popupRef.current.setLatLng([currentLat, currentLng]);
      } else {
        // When creating new marker, show loading state initially
        addMarkerToMap(
          mapInstanceRef.current,
          currentLat,
          currentLng,
          address,
          shouldShowSkeleton,
        );
      }
      mapInstanceRef.current.setView([currentLat, currentLng], 15);
    } else if (
      mapInstanceRef.current &&
      (currentLat === null || currentLng === null)
    ) {
      // Remove marker and popup when coordinates are cleared
      if (markerRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }

      if (popupRef.current) {
        mapInstanceRef.current.removeLayer(popupRef.current);
        popupRef.current = null;
      }
    }
  }, [currentLat, currentLng, address, addMarkerToMap, shouldShowSkeleton]);

  // Handle selecting a search result
  const handleSelectSearchResult = useCallback(
    (result: NominatimSearchResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);

      setCurrentLat(lat);
      setCurrentLng(lng);

      onLocationChange(lat, lng);

      // Format and set selected address and place_id
      const formattedAddress = formatAddressFromNominatim(result.address);

      setSearchPick({ lat, lng, label: formattedAddress });
      setSelectedAddress(formattedAddress);
      setSelectedPlaceId(result.place_id.toString());

      // Close search popover and keep the selected address visible
      setOpenSearch(false);

      // Update map view
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16);
      }
    },
    [onLocationChange, formatAddressFromNominatim],
  );

  // 🔄 Handle search popover open/close
  const handleOpenSearchChange = useCallback((open: boolean) => {
    if (open) {
      // Always clear search query when opening to allow fresh search
      setSearchQuery("");
    }
    setOpenSearch(open);
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    setIsLoadingGPS(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setCurrentLat(lat);
        setCurrentLng(lng);

        onLocationChange(lat, lng);
        setIsLoadingGPS(false);
      },
      (error) => {
        setIsLoadingGPS(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Permissão de localização negada.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Informação de localização indisponível.");
            break;
          case error.TIMEOUT:
            setGeoError("Tempo limite para obter localização excedido.");
            break;
          default:
            setGeoError("Erro desconhecido ao obter localização.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleClearLocation = useCallback(() => {
    // Clear everything: address, place_id, coordinates, and map markers
    setSelectedAddress("");
    setSelectedPlaceId("");
    setSearchPick(null);

    setSearchQuery("");

    setCurrentLat(null);
    setCurrentLng(null);

    // Notify parent component about the cleared location
    onLocationChange(null as any, null as any);

    // Remove marker from map
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (popupRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(popupRef.current);
      popupRef.current = null;
    }
  }, [onLocationChange]);

  return {
    isLoadingGPS,
    geoError,
    selectedPlaceId,
    selectedAddress,
    searchResults,
    isSearching,
    searchError,
    retrySearch,
    openSearch,
    handleSelectSearchResult,
    handleOpenSearchChange,
    handleClearLocation,
    handleGetCurrentLocation,
    searchQuery,
    setSearchQuery,
    currentLat,
    currentLng,
    mapInstanceRef,
    mapRef,
    tilesUnavailable,
    isLoadingAddress: shouldShowSkeleton, // Smart loading: only show when loading NEW data
    address,
    formatAddressFromNominatim,
  };
}

export { BRAZIL_CENTER, BRAZIL_ZOOM, useLocationPicker };
