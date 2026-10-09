/**
 * The environment variables behind the public configuration. Apart from
 * public-config.ts so the middleware can read the names without pulling zod
 * into the edge bundle.
 *
 * No NEXT_PUBLIC_ prefix on purpose: Next inlines those at build time, and
 * the image is built once and promoted from staging to production (12.2).
 */
const PUBLIC_ENV = {
  apiUrl: "PUBLIC_API_URL",
  socketUrl: "PUBLIC_SOCKET_URL",
  turnstileSiteKey: "TURNSTILE_SITE_KEY",
  mapTileUrl: "MAP_TILE_URL",
  mapTileAttribution: "MAP_TILE_ATTRIBUTION",
  mapTileUrlDark: "MAP_TILE_URL_DARK",
  mapTileAttributionDark: "MAP_TILE_ATTRIBUTION_DARK",
  siteUrl: "METADATA_BASE",
  appEnv: "APP_ENV",
} as const;

/** The names these replaced, quoted in the boot error so a stack is easy to fix. */
const LEGACY_NAMES: Partial<Record<string, string>> = {
  PUBLIC_API_URL: "NEXT_PUBLIC_HTTP_REQUEST",
  TURNSTILE_SITE_KEY: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  MAP_TILE_URL: "NEXT_PUBLIC_MAP_TILE_URL",
  MAP_TILE_ATTRIBUTION: "NEXT_PUBLIC_MAP_TILE_ATTRIBUTION",
};

export { LEGACY_NAMES, PUBLIC_ENV };
