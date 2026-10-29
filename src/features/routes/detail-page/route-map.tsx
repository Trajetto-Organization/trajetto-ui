"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "react-query";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
// The app's map theme, after Leaflet's own sheet.
import "@/features/control-tower/lib/leaflet-theme.css";

import { Button } from "@/components/ui/button";

import { escapeHtml } from "@/lib/escape-html";
import {
  LEAFLET_ATTRIBUTION_PREFIX,
  ZOOM_CONTROL_TITLES,
} from "@/lib/leaflet-pt-br";
import { isStaleActionResult } from "@/lib/action-result";

import type {
  RouteDriverPosition,
  RouteStop,
  RouteVisitedPoint,
} from "@/actions/route/get-route";
import { getRouteTrail } from "@/actions/route/route-operations";

import type { MapTiles } from "@/features/control-tower/lib/map-tiles";
import { addThemedTileLayer } from "@/features/control-tower/lib/themed-tile-layer";
import { vehicleStatus } from "@/features/control-tower/lib/vehicle-motion";
import { VehicleLayer } from "@/features/control-tower/map/vehicle-layer";

import {
  mapBounds,
  missingLocationLabel,
  stopMarkerColour,
  stopMarkers,
} from "../lib/route-map-points";
import { routeTrailKey } from "../lib/route-query-keys";

const BRAZIL_CENTRE: [number, number] = [-14.235, -51.9253];

interface RouteMapProps {
  tiles: MapTiles | null;
  stops: RouteStop[];

  /** The order on screen: the numbers follow a drag before it is saved. */
  orderedIds: string[];

  driverPosition: RouteDriverPosition | null;
  driverLabel: string;
  visitedPoints: RouteVisitedPoint[];

  businessId: string;
  routeId: string;
  driverId: string;

  /** A route that left draws where the driver went. */
  showTrail: boolean;

  highlightedStopId: string | null;
  onHighlight: (stopId: string | null) => void;

  /** "Fixar no mapa": the next click on the map is this delivery's point. */
  pinning: { deliveryId: string; label: string } | null;
  canPin: boolean;
  onStartPin: (deliveryId: string, label: string) => void;
  onCancelPin: () => void;
  onPin: (point: { latitude: number; longitude: number }) => void;
}

/** A phone or a tablet: one finger scrolls the page, two move the map. */
function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  return (
    L.Browser.mobile ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches)
  );
}

/** The numbered pin of a stop; Leaflet writes it with innerHTML. */
function stopMarkerHtml(
  position: number,
  status: string,
  highlighted: boolean,
): string {
  return `
    <div style="
      transform: translate(-50%, -50%);
      width: 26px; height: 26px; border-radius: 999px;
      display: flex; align-items: center; justify-content: center;
      font: 700 12px/1 system-ui, sans-serif; color: #fff;
      background: ${stopMarkerColour(status)};
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35);
      ${highlighted ? "outline: 3px solid #2563eb; outline-offset: 2px;" : ""}
    ">${escapeHtml(String(position))}</div>
  `;
}

/**
 * The route on a map (decision 14.7, §5.4): the stops numbered in the order on
 * screen, the plan line between them (straight — not a road route), the GPS
 * captured at the stops already worked, the driver's live position and, for a
 * route that left, the trail of THIS route. The same tiles, marker and touch
 * rules as the tower.
 */
const RouteMap = ({
  tiles,
  stops,
  orderedIds,
  driverPosition,
  driverLabel,
  visitedPoints,
  businessId,
  routeId,
  driverId,
  showTrail,
  highlightedStopId,
  onHighlight,
  pinning,
  canPin,
  onStartPin,
  onCancelPin,
  onPin,
}: RouteMapProps): JSX.Element => {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const stopLayer = useRef<L.LayerGroup | null>(null);
  const liveLayer = useRef<VehicleLayer | null>(null);
  const trailLayer = useRef<L.LayerGroup | null>(null);

  const framed = useRef<boolean>(false);
  const pinRef = useRef(onPin);
  const pinningRef = useRef(pinning);

  pinRef.current = onPin;
  pinningRef.current = pinning;

  const [touch, setTouch] = useState<boolean>(false);

  const { markers, missing } = useMemo(
    () => stopMarkers(stops, orderedIds),
    [stops, orderedIds],
  );

  // Invalidated by the route's events (use-route-detail): the line follows
  // the stops worked instead of staying as it was when the page opened.
  const trailQuery = useQuery(
    routeTrailKey(routeId, driverId),
    async () => {
      const answer = await getRouteTrail(businessId, driverId, routeId);

      if (isStaleActionResult(answer, { background: true })) return null;

      return answer.success ? (answer.data ?? null) : null;
    },
    { enabled: showTrail, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!container.current || map.current) return;

    const onTouch = isTouchDevice();

    setTouch(onTouch);

    const instance = L.map(container.current, {
      center: BRAZIL_CENTRE,
      zoom: 4,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: !onTouch,
      touchZoom: true,
    });

    L.control.zoom(ZOOM_CONTROL_TITLES).addTo(instance);
    instance.attributionControl.setPrefix(LEAFLET_ATTRIBUTION_PREFIX);

    // Follows the theme live (dark style or the CSS filter).
    const stopTiles = tiles ? addThemedTileLayer(L, instance, tiles) : null;

    instance.on("click", (event: L.LeafletMouseEvent) => {
      instance.scrollWheelZoom.enable();

      if (pinningRef.current) {
        pinRef.current({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    });
    instance.on("blur", () => instance.scrollWheelZoom.disable());
    instance.on("mouseout", () => instance.scrollWheelZoom.disable());

    map.current = instance;
    trailLayer.current = L.layerGroup().addTo(instance);
    stopLayer.current = L.layerGroup().addTo(instance);
    // The same truck as the tower, sliding between the pings it receives.
    liveLayer.current = new VehicleLayer(instance, {
      cluster: false,
      zIndexOffset: 1000,
    });

    return () => {
      stopTiles?.();
      liveLayer.current?.destroy();
      instance.remove();

      map.current = null;
      stopLayer.current = null;
      liveLayer.current = null;
      trailLayer.current = null;
    };
    // The tiles are fixed for the life of the page (read on the server).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stops, the plan line and the visited GPS.
  useEffect(() => {
    const instance = map.current;
    const group = stopLayer.current;

    if (!instance || !group) return;

    group.clearLayers();

    if (markers.length > 1) {
      L.polyline(
        markers.map(
          (marker) => [marker.latitude, marker.longitude] as [number, number],
        ),
        { color: "#64748b", weight: 2, opacity: 0.8, dashArray: "6 6" },
      ).addTo(group);
    }

    const plannedByDelivery = new Map(
      markers.map((marker) => [marker.deliveryId, marker]),
    );

    for (const visited of visitedPoints) {
      const planned = plannedByDelivery.get(visited.deliveryId);

      // The divergence "endereço × GPS" is what the proof highlights too.
      if (planned) {
        L.polyline(
          [
            [planned.latitude, planned.longitude],
            [visited.latitude, visited.longitude],
          ],
          { color: "#f59e0b", weight: 1, opacity: 0.8 },
        ).addTo(group);
      }

      L.circleMarker([visited.latitude, visited.longitude], {
        radius: 5,
        color: "#f59e0b",
        fillColor: "#f59e0b",
        fillOpacity: 0.9,
      })
        .bindTooltip(
          visited.type === "PROOF" ? "GPS do comprovante" : "GPS da chegada",
        )
        .addTo(group);
    }

    for (const marker of markers) {
      const pin = L.marker([marker.latitude, marker.longitude], {
        keyboard: true,
        title: `Parada ${marker.position}: ${marker.label}`,
        icon: L.divIcon({
          className: "",
          iconSize: [0, 0],
          html: stopMarkerHtml(
            marker.position,
            marker.status,
            marker.stopId === highlightedStopId,
          ),
        }),
      });

      pin.on("click", () => {
        onHighlight(marker.stopId);

        document
          .querySelector(`[data-stop-id="${CSS.escape(marker.stopId)}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });

      pin.addTo(group);
    }
    // Not on the driver's position: it changes with every ping, and each one
    // used to clear and recreate up to 200 pins and their lines.
  }, [markers, visitedPoints, highlightedStopId, onHighlight]);

  // Framed once, on what has a point; re-fitting on every change would yank
  // the map away from a dispatcher who zoomed into a street. Its own effect:
  // the driver's dot may be the only point there is, and once framed every
  // later ping returns here at once.
  useEffect(() => {
    const instance = map.current;

    if (!instance || framed.current) return;

    const box = mapBounds([...markers, driverPosition, ...visitedPoints]);

    if (!box) return;

    framed.current = true;

    instance.fitBounds(
      L.latLngBounds(
        L.latLng(box.south, box.west),
        L.latLng(box.north, box.east),
      ),
      { padding: [48, 48], maxZoom: 15, animate: false },
    );
  }, [markers, visitedPoints, driverPosition]);

  // The driver's dot.
  useEffect(() => {
    const group = liveLayer.current;

    if (!group) return;

    if (!driverPosition) {
      group.update([], null);
      return;
    }

    const state = driverPosition.fresh ? "moving" : "silent";

    group.update(
      [
        {
          id: "driver",
          latitude: driverPosition.latitude,
          longitude: driverPosition.longitude,
          heading: driverPosition.heading,
          recordedAt: driverPosition.recordedAt,
          status: vehicleStatus({
            state,
            fresh: driverPosition.fresh,
            speed: driverPosition.speed,
          }),
          label: driverLabel,
        },
      ],
      null,
    );
  }, [driverPosition, driverLabel]);

  // The trail of THIS route (§4.12).
  useEffect(() => {
    const group = trailLayer.current;

    if (!group) return;

    group.clearLayers();

    const points = trailQuery.data?.points ?? [];

    if (!showTrail || points.length < 2) return;

    L.polyline(
      points.map(
        (point) => [point.latitude, point.longitude] as [number, number],
      ),
      { color: "#2563eb", weight: 3, opacity: 0.7 },
    ).addTo(group);
  }, [trailQuery.data, showTrail]);

  // The crosshair says the next click pins.
  useEffect(() => {
    const element = container.current;

    if (element) element.style.cursor = pinning ? "crosshair" : "";
  }, [pinning]);

  const missingLabel = missingLocationLabel(missing.length);

  return (
    <section
      aria-label="Mapa da rota"
      className="relative space-y-2"
      data-tutorial="route-map"
    >
      <div
        ref={container}
        className="h-[60vh] min-h-[320px] w-full rounded-lg border md:h-[480px]"
        role="application"
        aria-label="Mapa das paradas da rota"
      />

      {!tiles && (
        <p
          className="pointer-events-none absolute inset-x-3 top-3 z-[400] rounded-md
          border bg-background/90 px-3 py-2 text-xs text-muted-foreground"
        >
          Mapa base não configurado: as paradas aparecem sem as ruas. Fale com o
          suporte.
        </p>
      )}

      {pinning && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5
          p-2 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p>Clique no mapa onde fica o endereço de {pinning.label}.</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onCancelPin}
          >
            Cancelar
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A linha tracejada liga as paradas na ordem da rota (linha reta, não é o
        caminho pelas ruas).
        {touch && " Use dois dedos para mover e ampliar o mapa."}
      </p>

      {missingLabel && (
        <details className="rounded-md border p-2 text-sm">
          <summary className="cursor-pointer text-amber-700 dark:text-amber-400">
            {missingLabel}
          </summary>

          <ul className="mt-2 space-y-1">
            {missing.map((stop) => (
              <li
                key={stop.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate">
                  {stop.delivery.recipient_name}
                </span>

                {canPin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() =>
                      onStartPin(stop.delivery.id, stop.delivery.recipient_name)
                    }
                  >
                    Fixar no mapa
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
};

export { RouteMap };
