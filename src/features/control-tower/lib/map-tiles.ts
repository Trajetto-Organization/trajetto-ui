/**
 * Where the tower's base map comes from (decision 7.4).
 *
 * The public OpenStreetMap servers do not take commercial load: their tile
 * policy asks heavy users to bring their own, and 3.600 companies with a
 * panel open all day is heavy. So production reads the provider from
 * `MAP_TILE_URL` (and its credit from `MAP_TILE_ATTRIBUTION`), and OSM is the
 * fallback in development only. A production without a provider shows the fleet on a blank canvas
 * and says so, rather than quietly breaking the OSM policy.
 *
 * Read on the server, per request, and handed to the maps — as props (tower,
 * route page) or through the public configuration (location picker,
 * src/env). The image is built once and promoted from staging (decision
 * 12.2), so a value inlined at build time would be staging's; that is also
 * why the names carry no NEXT_PUBLIC_ prefix.
 *
 * Dark theme (decision 16.123): `MAP_TILE_URL_DARK` (+ `MAP_TILE_ATTRIBUTION_DARK`)
 * names a provider's dark style, used while the theme is dark and swapped
 * live (themed-tile-layer.ts). Without it the light tiles are recolored by a
 * CSS filter (globals.css, "Maps in the dark theme").
 */

import { OSM_ATTRIBUTION } from "@/lib/leaflet-pt-br";
import type { AppEnv } from "@/lib/site";

interface MapTileSource {
  /** A Leaflet template: {z}, {x}, {y}, optionally {s} and {r}. */
  url: string;
  attribution: string;
}

interface MapTiles extends MapTileSource {
  /** The provider's dark style; absent when not configured (CSS filter then). */
  dark?: MapTileSource;
}

const OSM_TILES: MapTiles = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: OSM_ATTRIBUTION,
};

const DEFAULT_ATTRIBUTION = "© provedor de mapas";

/** The OSM tile hosts, for the CSP in development. */
const OSM_TILE_ORIGIN = "https://*.tile.openstreetmap.org";

/**
 * Leaflet writes the credit as HTML. The configured one is plain text: an
 * environment value must not become markup on every map of the panel.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A usable template: https (http only in development) with the tile axes. */
function isTileTemplate(value: string, env: AppEnv): boolean {
  if (!/\{z\}/.test(value) || !/\{x\}/.test(value) || !/\{y\}/.test(value)) {
    return false;
  }

  try {
    // The subdomain slot is not a valid host character; any stand-in is.
    const url = new URL(
      value.replace(/\{s\}/g, "a").replace(/\{[a-z]+\}/g, "0"),
    );

    return (
      url.protocol === "https:" ||
      (env === "development" && url.protocol === "http:")
    );
  } catch {
    return false;
  }
}

/**
 * The dark style, when MAP_TILE_URL_DARK is a usable template. Its credit
 * falls back to the base map's: a dark style of the same provider is the
 * usual case, and that credit names the provider.
 */
function resolveDarkTiles(
  settings: {
    darkUrl?: string | null;
    darkAttribution?: string | null;
    appEnv: AppEnv;
  },
  base: MapTileSource,
): MapTileSource | undefined {
  const url = settings.darkUrl?.trim();

  if (!url || !isTileTemplate(url, settings.appEnv)) return undefined;

  const credit = settings.darkAttribution?.trim();

  return { url, attribution: credit ? escapeHtml(credit) : base.attribution };
}

function resolveMapTiles(settings: {
  url?: string | null;
  attribution?: string | null;
  darkUrl?: string | null;
  darkAttribution?: string | null;
  appEnv: AppEnv;
}): MapTiles | null {
  const url = settings.url?.trim();
  const base: MapTiles | null =
    url && isTileTemplate(url, settings.appEnv)
      ? {
          url,
          attribution: escapeHtml(
            settings.attribution?.trim() || DEFAULT_ATTRIBUTION,
          ),
        }
      : settings.appEnv === "development"
        ? OSM_TILES
        : null;

  // No base map, no dark one either: the maps say "sem mapa de fundo".
  const dark = base ? resolveDarkTiles(settings, base) : undefined;

  return base && dark ? { ...base, dark } : base;
}

/**
 * The origin a CSP `img-src` must allow for these tiles, with the subdomain
 * slot as a wildcard (`https://*.tile.example.com`). For the CSP owner.
 */
function tileOriginForCsp(url: string): string | null {
  try {
    const parsed = new URL(
      url.replace(/\{s\}/g, "__sub__").replace(/\{[a-z]+\}/g, "0"),
    );

    return `${parsed.protocol}//${parsed.host.replace("__sub__", "*")}`;
  } catch {
    return null;
  }
}

/**
 * The environment as the page reads it at request time. The names are read
 * through a variable so the bundler cannot inline a build-time value.
 */
function readMapTileSettings(): {
  url?: string;
  attribution?: string;
  darkUrl?: string;
  darkAttribution?: string;
} {
  const env = process.env as Record<string, string | undefined>;
  const prefix = "MAP_TILE_";

  return {
    url: env[`${prefix}URL`],
    attribution: env[`${prefix}ATTRIBUTION`],
    darkUrl: env[`${prefix}URL_DARK`],
    darkAttribution: env[`${prefix}ATTRIBUTION_DARK`],
  };
}

export {
  OSM_TILES,
  OSM_TILE_ORIGIN,
  readMapTileSettings,
  resolveMapTiles,
  tileOriginForCsp,
};
export type { MapTileSource, MapTiles };
