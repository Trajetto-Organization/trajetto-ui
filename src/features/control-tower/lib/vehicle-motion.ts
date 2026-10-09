/**
 * How a truck moves and turns on the tower's map, as pure functions.
 *
 * A phone reports every few seconds to every few tens of seconds; drawing each
 * point as it lands makes the truck teleport, and a marker rebuilt on every
 * render flickers. The map instead slides from where the truck is DRAWN to the
 * new point over roughly the time between the two reports, and turns the short
 * way round. Everything here is free of Leaflet and the DOM so it can be tested.
 */

import type { TowerVehicleState } from "@/actions/control-tower/types";

interface LatLng {
  latitude: number;
  longitude: number;
}

/** What the marker says about a truck, beyond the API's three states. */
type VehicleStatus = "moving" | "stopped" | "paused" | "silent" | "ended";

const EARTH_RADIUS_M = 6_371_008.8;

/** Below this a GPS jitter is not a direction: keep the previous heading. */
const MIN_HEADING_MOVE_M = 5;

/** Under ~3.6 km/h a fresh truck is parked, not driving. In m/s, as the phone sends it. */
const STOPPED_SPEED_MS = 1;

/** The slide never runs shorter (a jerk) or longer (a lagging truck) than this. */
const MIN_MOTION_MS = 600;
const MAX_MOTION_MS = 8_000;

/** When the two reports do not say how far apart they were. */
const DEFAULT_MOTION_MS = 2_000;

/**
 * Farther than this is a backlog flush or a wrong fix, not a drive: the truck
 * jumps there instead of sliding across half the city.
 */
const TELEPORT_DISTANCE_M = 5_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Any angle into [0, 360). */
function normalizeAngle(degrees: number): number {
  const angle = degrees % 360;

  return angle < 0 ? angle + 360 : angle;
}

/** Great-circle distance in metres (haversine). */
function distanceMetres(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from one point to the next, clockwise from north, in [0, 360). */
function bearingDegrees(from: LatLng, to: LatLng): number {
  const phi1 = toRadians(from.latitude);
  const phi2 = toRadians(to.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);

  return normalizeAngle(toDegrees(Math.atan2(y, x)));
}

/**
 * The angle to animate TO so the turn is the short way round.
 *
 * `from` is the unwrapped angle currently drawn (it may be 370 or -20 after a
 * few turns); the result is `to` shifted by whole turns to sit within 180° of
 * it. A truck going from 350° to 10° turns 20° right, not 340° left.
 */
function shortestAngleTarget(from: number, to: number): number {
  const delta = normalizeAngle(to - from);

  return from + (delta > 180 ? delta - 360 : delta);
}

/**
 * Where the truck points: the phone's heading when it sends one, else the
 * bearing from the previous point, else whatever it pointed at before.
 */
function resolveHeading({
  heading,
  previous,
  next,
  fallback,
}: {
  heading: number | null | undefined;
  previous: LatLng | null;
  next: LatLng;
  fallback: number;
}): number {
  // Android sends -1 (and some devices NaN) for "unknown".
  if (typeof heading === "number" && Number.isFinite(heading) && heading >= 0) {
    return normalizeAngle(heading);
  }

  if (previous && distanceMetres(previous, next) >= MIN_HEADING_MOVE_M) {
    return bearingDegrees(previous, next);
  }

  return fallback;
}

/** Slow in, slow out: a truck neither starts nor stops instantly. */
function easeInOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));

  return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** A point between two, `t` in [0, 1]. Straight in degrees: fine at street scale. */
function interpolatePosition(from: LatLng, to: LatLng, t: number): LatLng {
  return {
    latitude: lerp(from.latitude, to.latitude, t),
    longitude: lerp(from.longitude, to.longitude, t),
  };
}

/**
 * How long the slide to the new point lasts: about the time the phone took
 * between the two reports, so the truck arrives as the next one is due.
 */
function motionDuration(
  previousRecordedAt: string | null | undefined,
  nextRecordedAt: string | null | undefined,
): number {
  const from = previousRecordedAt ? Date.parse(previousRecordedAt) : Number.NaN;
  const to = nextRecordedAt ? Date.parse(nextRecordedAt) : Number.NaN;

  if (Number.isNaN(from) || Number.isNaN(to) || to <= from)
    return DEFAULT_MOTION_MS;

  return Math.min(MAX_MOTION_MS, Math.max(MIN_MOTION_MS, to - from));
}

function shouldTeleport(from: LatLng, to: LatLng): boolean {
  return distanceMetres(from, to) > TELEPORT_DISTANCE_M;
}

/** One slide in progress: from where the truck was drawn to the new point. */
interface Motion {
  from: LatLng;
  to: LatLng;
  angleFrom: number;
  angleTo: number;
  startedAt: number;
  duration: number;
}

interface MotionFrame extends LatLng {
  angle: number;
  done: boolean;
}

/** Where the truck is drawn at `now`, and whether the slide has finished. */
function sampleMotion(motion: Motion, now: number): MotionFrame {
  const raw =
    motion.duration > 0 ? (now - motion.startedAt) / motion.duration : 1;
  const done = raw >= 1;
  const t = easeInOutCubic(raw);
  const point = done
    ? motion.to
    : interpolatePosition(motion.from, motion.to, t);

  return {
    ...point,
    angle: done ? motion.angleTo : lerp(motion.angleFrom, motion.angleTo, t),
    done,
  };
}

/**
 * The status the marker shows. The API says moving / silent / ended; the map
 * splits a fresh truck into "em rota" and "parado" by its speed, and shows an
 * open pause as such so a lunch break is not read as a truck stuck somewhere.
 */
function vehicleStatus(position: {
  state?: TowerVehicleState;
  fresh: boolean;
  speed?: number | null;
  pausedSince?: string | null;
}): VehicleStatus {
  const state = position.state ?? (position.fresh ? "moving" : "silent");

  if (state === "ended") return "ended";
  if (position.pausedSince) return "paused";
  if (state === "silent") return "silent";

  const speed = position.speed;

  // No speed from the phone is no evidence of standing still.
  if (typeof speed === "number" && speed >= 0 && speed < STOPPED_SPEED_MS) {
    return "stopped";
  }

  return "moving";
}

/**
 * Which member a cluster speaks for, most urgent first. A cluster used to take
 * the API's three states, so a yard of parked or paused trucks showed as a blue
 * "em rota" badge that split into amber and violet trucks on zoom.
 */
const CLUSTER_PRECEDENCE: readonly VehicleStatus[] = [
  "moving",
  "stopped",
  "paused",
  "silent",
  "ended",
];

/** The status a cluster badge shows; "ended" only when every truck finished. */
function clusterStatus(statuses: readonly VehicleStatus[]): VehicleStatus {
  if (statuses.length === 0) return "silent";

  return (
    CLUSTER_PRECEDENCE.find((status) => statuses.includes(status)) ?? "silent"
  );
}

export {
  DEFAULT_MOTION_MS,
  MAX_MOTION_MS,
  MIN_HEADING_MOVE_M,
  MIN_MOTION_MS,
  STOPPED_SPEED_MS,
  TELEPORT_DISTANCE_M,
  bearingDegrees,
  clusterStatus,
  distanceMetres,
  easeInOutCubic,
  interpolatePosition,
  motionDuration,
  normalizeAngle,
  resolveHeading,
  sampleMotion,
  shortestAngleTarget,
  shouldTeleport,
  vehicleStatus,
};
export type { LatLng, Motion, MotionFrame, VehicleStatus };
