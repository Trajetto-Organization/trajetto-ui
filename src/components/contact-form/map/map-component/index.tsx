"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  latitude: number;
  longitude: number;
  /** Zoom do Leaflet. Padrão enquadra o Brasil inteiro, não uma rua. */
  zoom?: number;
  /** Título e subtítulo do balão fixo sobre o mapa. */
  popupTitle: string;
  popupSubtitle: string;
}

const MapComponent = ({
  latitude,
  longitude,
  zoom = 4,
  popupTitle,
  popupSubtitle,
}: MapComponentProps): JSX.Element => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Fix Leaflet icon issue in Next.js
    const fixLeafletIcon = () => {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;

      // Served from `public/` instead of a CDN: the markers stay available
      // offline and behind restrictive networks, and they match the Leaflet
      // version actually installed.
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "/leaflet/marker-icon-2x.png",
        iconUrl: "/leaflet/marker-icon.png",
        shadowUrl: "/leaflet/marker-shadow.png",
      });
    };

    fixLeafletIcon();

    // Initialize the map
    if (
      typeof window !== "undefined" &&
      mapRef.current &&
      !mapInstanceRef.current
    ) {
      // Caixa que envolve o território brasileiro (sudoeste → nordeste).
      const brazilBounds = L.latLngBounds(
        L.latLng(-33.75, -73.99),
        L.latLng(5.27, -34.79),
      );

      // Create the map
      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom,
        zoomControl: false,
        attributionControl: false, // Remove attribution for a cleaner look
        scrollWheelZoom: false, // Disables scroll zoom for static maps
        dragging: false, // Can be set to false if you want a fully static map
        // Trava o enquadramento no Brasil: sem isso o mapa "sobra" para os
        // vizinhos conforme o container muda de tamanho.
        maxBounds: brazilBounds,
        maxBoundsViscosity: 1,
      });

      mapInstanceRef.current = map;

      // Enquadra o país inteiro respeitando a proporção do container.
      map.fitBounds(brazilBounds, { padding: [0, 0], animate: false });

      // Use OpenStreetMap (completely free, no API key required)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Alternative option: CartoDB Voyager (also free, modern design)
      // L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      //   maxZoom: 19,
      //   attribution: '© OpenStreetMap contributors, © CARTO'
      // }).addTo(map);

      // Custom icon - empty since we're using the Framer Motion marker
      const customIcon = L.divIcon({
        className: "", // Remove default class to have no default CSS style
        html: `
          <div style="position:relative; display:none;">
            <!-- Empty because we're using the Framer Motion visual component -->
          </div>
        `,
        iconSize: [0, 0], // Zero size - we are using a separate visual marker
      });

      // Add an invisible marker for the popup
      L.marker([latitude, longitude], {
        icon: customIcon,
      }).addTo(map);

      // Add a custom popup that won't close when clicking elsewhere
      L.popup({
        closeButton: false,
        offset: [0, -10],
        className: "custom-popup",
        autoClose: false, // Prevents popup from closing when clicking elsewhere
        closeOnClick: false, // Prevents popup from closing when clicking on map
        closeOnEscapeKey: false, // Prevents popup from closing when pressing Escape
      })
        .setLatLng([latitude, longitude])
        .setContent(
          `
          <div style="text-align: center; padding: 8px; min-width: 170px;">
            <strong style="color: #d81b60; display: block; margin-bottom: 5px; font-size: 15px;">${popupTitle}</strong>
            <span style="display: block; font-size: 13px;">${popupSubtitle}</span>
          </div>
        `,
        )
        .openOn(map);

      // Disable all map interactions for a completely static experience
      map.boxZoom.disable();
      map.doubleClickZoom.disable();

      map.keyboard.disable();
      map.touchZoom.disable();
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, zoom, popupTitle, popupSubtitle]);

  return <div ref={mapRef} className="h-full w-full" />;
};

export default MapComponent;
