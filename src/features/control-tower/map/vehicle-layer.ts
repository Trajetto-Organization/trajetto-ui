import L from "leaflet";

import { clusterPositions } from "../lib/cluster";
import {
  clusterStatus,
  motionDuration,
  resolveHeading,
  sampleMotion,
  shortestAngleTarget,
  shouldTeleport,
  type LatLng,
  type Motion,
  type VehicleStatus,
} from "../lib/vehicle-motion";
import {
  CLUSTER_ICON_CLASS,
  CLUSTER_ICON_SIZE,
  LABELS_CLASS,
  LABEL_ZOOM,
  VEHICLE_ICON_CLASS,
  VEHICLE_ICON_SIZE,
  clusterMarkerHtml,
  clusterTitle,
  ensureVehicleMarkerStyles,
  setMarkerName,
  setVehicleRotation,
  syncVehicleElement,
  vehicleMarkerHtml,
  vehicleTitle,
} from "./vehicle-marker";

/** One truck as the layer needs it; the map computes status and label. */
interface VehicleInput extends LatLng {
  id: string;
  heading: number | null;
  recordedAt: string;
  status: VehicleStatus;
  label: string;
}

interface VehicleLayerOptions {
  /** Group trucks that would overlap at the current zoom (the tower). */
  cluster: boolean;
  onSelect?: (id: string) => void;
  /** Clicking a cluster: by default, zoom in two levels on it. */
  onClusterClick?: (centre: L.LatLng) => void;
  zIndexOffset?: number;
}

interface Track {
  input: VehicleInput;
  /** Where the truck is DRAWN right now: the start of the next slide. */
  drawn: LatLng;
  angle: number;
  motion: Motion | null;
  marker: L.Marker | null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isHidden(): boolean {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

/**
 * The trucks on a Leaflet map, kept across renders.
 *
 * Each truck owns ONE marker for as long as it is drawn on its own: a new
 * position slides it there (requestAnimationFrame, eased, short-way turn) and
 * a new status mutates its element. Rebuilding every marker on each render —
 * what the map did before — made a truck flicker and jump on every refetch and
 * every ping. One animation loop serves the whole fleet, runs only while
 * something moves, stops while the tab is hidden (the trucks land on their
 * last point when it comes back) and is skipped under reduced motion.
 *
 * Clusters are cheap badges and are rebuilt per cut; a truck that joins a
 * cluster loses its marker and gets a fresh one when it comes apart.
 */
class VehicleLayer {
  private group: L.LayerGroup;
  private tracks = new Map<string, Track>();
  private clusters = new Map<string, L.Marker>();
  private selectedId: string | null = null;
  private frame: number | null = null;
  private disposed = false;

  constructor(
    private map: L.Map,
    private options: VehicleLayerOptions,
  ) {
    ensureVehicleMarkerStyles();

    this.group = L.layerGroup().addTo(map);

    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  /** The fleet as it is now; call on every change, the layer diffs. */
  update(vehicles: VehicleInput[], selectedId: string | null): void {
    if (this.disposed) return;

    this.selectedId = selectedId;

    const now = performance.now();
    const animate = !prefersReducedMotion() && !isHidden();
    const seen = new Set<string>();

    for (const input of vehicles) {
      seen.add(input.id);
      this.retarget(input, now, animate);
    }

    for (const [id, track] of this.tracks) {
      if (seen.has(id)) continue;

      if (track.marker) this.group.removeLayer(track.marker);
      this.tracks.delete(id);
    }

    this.layout();
    this.schedule();
  }

  /** Re-cuts the clusters (the zoom changed) without touching any motion. */
  relayout(): void {
    if (!this.disposed) this.layout();
  }

  destroy(): void {
    this.disposed = true;

    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;

    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.map.getContainer().classList.remove(LABELS_CLASS);
    this.group.remove();
    this.tracks.clear();
    this.clusters.clear();
  }

  private retarget(input: VehicleInput, now: number, animate: boolean): void {
    const track = this.tracks.get(input.id);
    const target: LatLng = {
      latitude: input.latitude,
      longitude: input.longitude,
    };

    if (!track) {
      this.tracks.set(input.id, {
        input,
        drawn: target,
        angle: resolveHeading({
          heading: input.heading,
          previous: null,
          next: target,
          fallback: 0,
        }),
        motion: null,
        marker: null,
      });

      return;
    }

    const previous = track.input;
    const moved =
      previous.latitude !== input.latitude ||
      previous.longitude !== input.longitude;

    track.input = input;

    if (!moved && previous.heading === input.heading) return;

    // Continue from where the truck is drawn, never from where it was meant
    // to be: a point landing mid-slide must not make it jump.
    if (track.motion) {
      const frame = sampleMotion(track.motion, now);

      track.drawn = { latitude: frame.latitude, longitude: frame.longitude };
      track.angle = frame.angle;
    }

    const heading = resolveHeading({
      heading: input.heading,
      previous: { latitude: previous.latitude, longitude: previous.longitude },
      next: target,
      fallback: track.angle,
    });

    const angleTo = shortestAngleTarget(track.angle, heading);

    if (!animate || !track.marker || shouldTeleport(track.drawn, target)) {
      track.motion = null;
      track.drawn = target;
      track.angle = angleTo;
      this.paint(track);

      return;
    }

    track.motion = {
      from: track.drawn,
      to: target,
      angleFrom: track.angle,
      angleTo,
      startedAt: now,
      duration: motionDuration(previous.recordedAt, input.recordedAt),
    };
  }

  /** Who is drawn alone and who in a cluster, at the zoom on screen. */
  private layout(): void {
    const zoom = this.map.getZoom();

    this.map.getContainer().classList.toggle(LABELS_CLASS, zoom >= LABEL_ZOOM);

    // Cut on the TARGET points: a truck mid-slide belongs where it is going.
    const items = [...this.tracks.values()].map((track) => ({
      latitude: track.input.latitude,
      longitude: track.input.longitude,
      track,
    }));

    const groups = this.options.cluster
      ? clusterPositions(items, zoom)
      : items.map((item) => ({ ...item, items: [item] }));

    const liveClusters = new Set<string>();

    for (const group of groups) {
      if (group.items.length === 1) {
        this.showAlone(group.items[0].track);
        continue;
      }

      for (const { track } of group.items) this.hideInCluster(track);

      const key = group.items
        .map(({ track }) => track.input.id)
        .sort()
        .join("|");

      liveClusters.add(key);
      this.showCluster(
        key,
        group.latitude,
        group.longitude,
        group.items.map(({ track }) => track),
      );
    }

    for (const [key, marker] of this.clusters) {
      if (liveClusters.has(key)) continue;

      this.group.removeLayer(marker);
      this.clusters.delete(key);
    }
  }

  private showAlone(track: Track): void {
    const { input } = track;
    const selected = input.id === this.selectedId;

    if (!track.marker) {
      const marker = L.marker([track.drawn.latitude, track.drawn.longitude], {
        title: vehicleTitle(input.label, input.status),
        alt: vehicleTitle(input.label, input.status),
        keyboard: true,
        riseOnHover: true,
        zIndexOffset: (this.options.zIndexOffset ?? 0) + (selected ? 1000 : 0),
        icon: L.divIcon({
          className: VEHICLE_ICON_CLASS,
          iconSize: [VEHICLE_ICON_SIZE, VEHICLE_ICON_SIZE],
          iconAnchor: [VEHICLE_ICON_SIZE / 2, VEHICLE_ICON_SIZE / 2],
          // Leaflet writes this with innerHTML: the label is escaped there.
          html: vehicleMarkerHtml({
            label: input.label,
            status: input.status,
            selected,
          }),
        }),
      });

      marker.on("click", () => this.options.onSelect?.(track.input.id));
      marker.addTo(this.group);

      track.marker = marker;
      // A truck that was hidden in a cluster reappears where it is now.
      track.motion = null;
      track.drawn = { latitude: input.latitude, longitude: input.longitude };
    }

    track.marker.setZIndexOffset(
      (this.options.zIndexOffset ?? 0) + (selected ? 1000 : 0),
    );
    syncVehicleElement(track.marker.getElement(), {
      label: input.label,
      status: input.status,
      selected,
    });
    this.paint(track);
  }

  private hideInCluster(track: Track): void {
    if (track.marker) {
      this.group.removeLayer(track.marker);
      track.marker = null;
    }

    // Nothing to animate while hidden: it lands on its point.
    track.motion = null;
    track.drawn = {
      latitude: track.input.latitude,
      longitude: track.input.longitude,
    };
  }

  private showCluster(
    key: string,
    latitude: number,
    longitude: number,
    members: Track[],
  ): void {
    const status = clusterStatus(members.map((track) => track.input.status));
    const html = clusterMarkerHtml(members.length, status);
    const existing = this.clusters.get(key);

    if (existing) {
      existing.setLatLng([latitude, longitude]);

      const element = existing.getElement();

      if (element && element.innerHTML !== html) element.innerHTML = html;
      setMarkerName(element, clusterTitle(members.length));

      return;
    }

    const marker = L.marker([latitude, longitude], {
      title: clusterTitle(members.length),
      alt: clusterTitle(members.length),
      keyboard: true,
      zIndexOffset: (this.options.zIndexOffset ?? 0) + 500,
      icon: L.divIcon({
        className: CLUSTER_ICON_CLASS,
        iconSize: [CLUSTER_ICON_SIZE, CLUSTER_ICON_SIZE],
        iconAnchor: [CLUSTER_ICON_SIZE / 2, CLUSTER_ICON_SIZE / 2],
        html,
      }),
    });

    marker.on("click", () => {
      const centre = marker.getLatLng();

      if (this.options.onClusterClick) {
        this.options.onClusterClick(centre);
        return;
      }

      this.map.setView(centre, Math.min(18, this.map.getZoom() + 2));
    });

    marker.addTo(this.group);
    // Leaflet only sets `title`; a role=button would otherwise be named "2".
    setMarkerName(marker.getElement(), clusterTitle(members.length));
    this.clusters.set(key, marker);
  }

  private paint(track: Track): void {
    if (!track.marker) return;

    track.marker.setLatLng([track.drawn.latitude, track.drawn.longitude]);
    setVehicleRotation(track.marker.getElement(), track.angle);
  }

  private schedule(): void {
    if (this.frame !== null || this.disposed || isHidden()) return;

    const moving = [...this.tracks.values()].some((track) => track.motion);

    if (moving) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number): void => {
    this.frame = null;

    for (const track of this.tracks.values()) {
      if (!track.motion) continue;

      const frame = sampleMotion(track.motion, now);

      track.drawn = { latitude: frame.latitude, longitude: frame.longitude };
      track.angle = frame.angle;

      if (frame.done) track.motion = null;

      this.paint(track);
    }

    this.schedule();
  };

  /** Hidden: stop. Back: every truck lands on its last point, then carries on. */
  private handleVisibility = (): void => {
    if (isHidden()) {
      if (this.frame !== null) cancelAnimationFrame(this.frame);
      this.frame = null;

      return;
    }

    for (const track of this.tracks.values()) {
      if (!track.motion) continue;

      track.drawn = track.motion.to;
      track.angle = track.motion.angleTo;
      track.motion = null;
      this.paint(track);
    }
  };
}

export { VehicleLayer };
export type { VehicleInput, VehicleLayerOptions };
