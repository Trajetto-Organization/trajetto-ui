"use client";

import { useEffect, useRef, useState } from "react";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
// The app's map theme, after Leaflet's own sheet.
import "../lib/leaflet-theme.css";

import { boundsOf } from "../lib/cluster";
import type { MapTiles } from "../lib/map-tiles";
import { addThemedTileLayer } from "../lib/themed-tile-layer";
import { vehicleStatus } from "../lib/vehicle-motion";
import { markerLabel } from "./marker-html";
import { VehicleLayer, type VehicleInput } from "./vehicle-layer";
import { VehicleLegend } from "./vehicle-legend";
import type { TowerPosition, TrailPoint } from "@/actions/control-tower/types";
import {
  LEAFLET_ATTRIBUTION_PREFIX,
  ZOOM_CONTROL_TITLES,
} from "@/lib/leaflet-pt-br";

interface TowerMapProps {
  positions: TowerPosition[];

  /** The day of the driver somebody opened, or null. */
  trail: TrailPoint[] | null;

  selectedDriverId: string | null;
  onSelectDriver: (driverId: string | null) => void;

  /** The base map; null draws the fleet on a blank canvas (see map-tiles). */
  tiles: MapTiles | null;
}

/**
 * Where the trucks are.
 *
 * Plain Leaflet and not react-leaflet, because that is what this codebase
 * already uses and a second map abstraction would be a second set of lifecycle
 * bugs. The trucks live in a VehicleLayer that keeps one marker per truck and
 * slides it to each new point: rebuilding them on every render made the fleet
 * flicker and jump with every ping. A truck that leaves the fleet loses its
 * marker in the same update, so no stale dot survives a driver going home.
 */
const BRAZIL_CENTRE: [number, number] = [-14.235, -51.9253];

/** A phone or a tablet: one finger scrolls the page, two move the map. */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    L.Browser.mobile ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches)
  );
}

/** A tower position as the vehicle layer draws it. */
function toVehicleInput(position: TowerPosition): VehicleInput {
  return {
    id: position.driverId,
    latitude: position.latitude,
    longitude: position.longitude,
    heading: position.heading,
    recordedAt: position.recordedAt,
    status: vehicleStatus(position),
    label: markerLabel([position]),
  };
}

const TowerMap = ({
  positions,
  trail,
  selectedDriverId,
  onSelectDriver,
  tiles,
}: TowerMapProps): JSX.Element => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  const layer = useRef<VehicleLayer | null>(null);
  const trailLayer = useRef<L.LayerGroup | null>(null);

  /** Whether the map has already been framed on the fleet. */
  const framed = useRef<boolean>(false);

  /**
   * The zoom the clusters were cut at, as state.
   *
   * The clusters depend on the zoom and used to be computed only when the
   * positions changed: the fleet was grouped at zoom 4 before the first
   * fitBounds, and clicking a cluster zoomed in without splitting it until
   * the next poll (UI-TWR-2).
   */
  const [zoom, setZoom] = useState<number>(4);

  // Read inside the layer's click handler, which outlives renders.
  const select = useRef({ onSelectDriver, selectedDriverId });

  select.current = { onSelectDriver, selectedDriverId };

  const [touch, setTouch] = useState<boolean>(false);

  useEffect(() => {
    if (!container.current || map.current) return;

    const onTouch = isTouchDevice();

    setTouch(onTouch);

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
      // Added below with Portuguese names; the default says "Zoom in".
      zoomControl: false,
      attributionControl: true,

      // The map does not take the page's scroll (UI-TWR-5): the wheel zooms
      // only after the map is clicked, and on a phone one finger scrolls the
      // page while two fingers pan and pinch the map.
      scrollWheelZoom: false,
      dragging: !onTouch,
      touchZoom: true,
    });

    L.control.zoom(ZOOM_CONTROL_TITLES).addTo(instance);
    instance.attributionControl.setPrefix(LEAFLET_ATTRIBUTION_PREFIX);

    // Follows the theme live (dark style or the CSS filter).
    const stopTiles = tiles ? addThemedTileLayer(L, instance, tiles) : null;

    const enableWheel = () => instance.scrollWheelZoom.enable();
    const disableWheel = () => instance.scrollWheelZoom.disable();

    instance.on("click", enableWheel);
    instance.on("focus", enableWheel);
    instance.on("blur", disableWheel);
    instance.on("mouseout", disableWheel);

    instance.on("zoomend", () => setZoom(instance.getZoom()));

    map.current = instance;

    layer.current = new VehicleLayer(instance, {
      cluster: true,
      onSelect: (driverId) => {
        const { onSelectDriver: choose, selectedDriverId: current } =
          select.current;

        choose(driverId === current ? null : driverId);
      },
    });
    trailLayer.current = L.layerGroup().addTo(instance);

    return () => {
      stopTiles?.();
      layer.current?.destroy();
      instance.remove();

      // A new map (React's dev double mount, a remount) frames the fleet again.
      framed.current = false;

      map.current = null;
      layer.current = null;
      trailLayer.current = null;
    };
    // The tiles are fixed for the life of the page (read on the server).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;

    if (!instance || !group) return;

    // Framed once, on the first fleet that arrives, BEFORE clustering: the
    // fit moves the zoom, and its zoomend re-runs this with the real one.
    // Re-fitting on every refresh would yank the map away from a dispatcher
    // who had just zoomed into a neighbourhood.
    if (!framed.current && positions.length > 0) {
      const box = boundsOf(positions);

      if (box) {
        framed.current = true;

        instance.fitBounds(
          L.latLngBounds(
            L.latLng(box.south, box.west),
            L.latLng(box.north, box.east),
          ),
          { padding: [48, 48], maxZoom: 15, animate: false },
        );

        if (instance.getZoom() !== zoom) {
          setZoom(instance.getZoom());
          return;
        }
      }
    }

    group.update(positions.map(toVehicleInput), selectedDriverId);
  }, [positions, selectedDriverId, zoom]);

  useEffect(() => {
    const group = trailLayer.current;

    if (!group) return;

    group.clearLayers();

    if (!trail || trail.length < 2) return;

    L.polyline(
      trail.map(
        (point) => [point.latitude, point.longitude] as [number, number],
      ),
      { color: "#2563eb", weight: 3, opacity: 0.7 },
    ).addTo(group);
  }, [trail]);

  return (
    <div className="relative" data-tutorial="control-tower-map">
      <div
        ref={container}
        className="h-[60vh] min-h-[320px] w-full rounded-lg border
        md:h-[480px]"
        role="application"
        aria-label="Mapa da frota"
      />

      {/* Over the map only when it is wide enough to sit beside the
          attribution (which the OSM licence keeps visible); under it
          otherwise, where an overlay would cover trucks or the credit. */}
      <VehicleLegend
        className="mt-2 xl:absolute xl:bottom-3 xl:left-3 xl:z-[400] xl:mt-0
        xl:max-w-[calc(100%-20rem)] xl:rounded-md xl:border xl:bg-background/90
        xl:px-3 xl:py-2 xl:shadow-sm xl:backdrop-blur-sm"
      />

      {touch && (
        <p className="mt-1 text-xs text-muted-foreground">
          Use dois dedos para mover e ampliar o mapa.
        </p>
      )}

      {!tiles && (
        <p
          className="pointer-events-none absolute inset-x-3 top-3 z-[400]
          rounded-md border bg-background/90 px-3 py-2 text-xs
          text-muted-foreground"
        >
          Mapa base não configurado: os veículos aparecem sem as ruas. Fale com
          o suporte.
        </p>
      )}
    </div>
  );
};

export { TowerMap };
