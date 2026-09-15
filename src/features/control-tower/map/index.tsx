"use client";

import { useEffect, useRef } from "react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { boundsOf, clusterPositions } from "../lib/cluster";
import type { TowerPosition, TrailPoint } from "@/actions/control-tower";

interface TowerMapProps {
  positions: TowerPosition[];

  /** The day of the driver somebody opened, or null. */
  trail: TrailPoint[] | null;

  selectedDriverId: string | null;
  onSelectDriver: (driverId: string | null) => void;
}

/**
 * Where the trucks are.
 *
 * Plain Leaflet and not react-leaflet, because that is what this codebase
 * already uses and a second map abstraction would be a second set of lifecycle
 * bugs. The markers are rebuilt on every change rather than diffed: thirty
 * markers is nothing to redraw, and a diff is where a stale dot survives a
 * driver going home.
 *
 * Tiles from OpenStreetMap, no key, like the rest of the product. A provider
 * that needs a key is a decision with a bill attached and belongs to the
 * operation, not to this file.
 */
const BRAZIL_CENTRE: [number, number] = [-14.235, -51.9253];

const TowerMap = ({
  positions,
  trail,
  selectedDriverId,
  onSelectDriver,
}: TowerMapProps): JSX.Element => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  const layer = useRef<L.LayerGroup | null>(null);
  const trailLayer = useRef<L.LayerGroup | null>(null);

  /** Whether the map has already been framed on the fleet. */
  const framed = useRef<boolean>(false);

  useEffect(() => {
    if (!container.current || map.current) return;

    // Served from `public/` rather than a CDN, matching the Leaflet version
    // actually installed — and available behind a restrictive network.
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });

    const instance = L.map(container.current, {
      center: BRAZIL_CENTRE,
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(instance);

    map.current = instance;

    layer.current = L.layerGroup().addTo(instance);
    trailLayer.current = L.layerGroup().addTo(instance);

    return () => {
      instance.remove();

      map.current = null;
      layer.current = null;
      trailLayer.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;

    if (!instance || !group) return;

    group.clearLayers();

    const clusters = clusterPositions(positions, instance.getZoom());

    for (const cluster of clusters) {
      const single = cluster.items.length === 1 ? cluster.items[0] : null;

      // A stale dot is drawn differently rather than hidden. "Onde ele estava
      // há duas horas" is information; a truck that silently disappears from
      // the map is a phone call.
      const stale = cluster.items.every((item) => !item.fresh);

      const label = single
        ? (single.vehiclePlate ?? single.driverName ?? "—")
        : String(cluster.items.length);

      const marker = L.marker([cluster.latitude, cluster.longitude], {
        icon: L.divIcon({
          className: "",
          iconSize: [0, 0],
          html: `
            <div style="
              transform: translate(-50%, -50%);
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 4px 8px;
              border-radius: 999px;
              font: 600 11px/1.2 system-ui, sans-serif;
              white-space: nowrap;
              color: #fff;
              background: ${stale ? "#71717a" : "#2563eb"};
              box-shadow: 0 1px 4px rgba(0,0,0,.35);
              border: 2px solid #fff;
              ${
                single && single.driverId === selectedDriverId
                  ? "outline: 3px solid #2563eb; outline-offset: 2px;"
                  : ""
              }
            ">${label}</div>
          `,
        }),
      });

      marker.on("click", () => {
        // A cluster is not a driver. Clicking one zooms in until it comes
        // apart, which is the only honest answer to "which of these?".
        if (!single) {
          instance.setView(
            [cluster.latitude, cluster.longitude],
            Math.min(18, instance.getZoom() + 2),
          );

          return;
        }

        onSelectDriver(
          single.driverId === selectedDriverId ? null : single.driverId,
        );
      });

      marker.addTo(group);
    }

    // Framed once, on the first fleet that arrives. Re-fitting on every
    // refresh would yank the map away from a dispatcher who had just zoomed
    // into a neighbourhood.
    if (!framed.current && positions.length > 0) {
      const box = boundsOf(positions);

      if (box) {
        instance.fitBounds(
          L.latLngBounds(
            L.latLng(box.south, box.west),
            L.latLng(box.north, box.east),
          ),
          { padding: [48, 48], maxZoom: 15 },
        );

        framed.current = true;
      }
    }
  }, [positions, selectedDriverId, onSelectDriver]);

  useEffect(() => {
    const group = trailLayer.current;

    if (!group) return;

    group.clearLayers();

    if (!trail || trail.length < 2) return;

    L.polyline(
      trail.map((point) => [point.latitude, point.longitude] as [number, number]),
      { color: "#2563eb", weight: 3, opacity: 0.7 },
    ).addTo(group);
  }, [trail]);

  return (
    <div
      ref={container}
      className="h-[480px] w-full rounded-lg border"
      role="application"
      aria-label="Mapa da frota"
    />
  );
};

export { TowerMap };
