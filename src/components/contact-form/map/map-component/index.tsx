"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  latitude: number;
  longitude: number;
}

const MapComponent = ({
  latitude,
  longitude,
}: MapComponentProps): JSX.Element => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Fix Leaflet icon issue in Next.js
    const fixLeafletIcon = () => {
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;

      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
      });
    };

    fixLeafletIcon();

    // Initialize the map
    if (
      typeof window !== "undefined" &&
      mapRef.current &&
      !mapInstanceRef.current
    ) {
      // Create the map
      const map = L.map(mapRef.current, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false, // Remove attribution for a cleaner look
        scrollWheelZoom: false, // Disables scroll zoom for static maps
        dragging: false, // Can be set to false if you want a fully static map
      });

      mapInstanceRef.current = map;

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
          <div style="text-align: center; padding: 8px; min-width: 150px;">
            <strong style="color: #d81b60; display: block; margin-bottom: 5px; font-size: 15px;">Trajetto</strong>
            <span style="display: block; font-size: 13px;">Av. Afonso Pena, 1500</span>
            <span style="display: block; font-size: 12px; color: #666;">Belo Horizonte, MG</span>
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
  }, [latitude, longitude]);

  return <div ref={mapRef} className="h-full w-full" />;
};

export default MapComponent;
