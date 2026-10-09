/**
 * The web's public configuration: the values the browser needs (API URL,
 * socket URL, Turnstile site key, map tiles, environment), read from the
 * server's environment at RUN time.
 *
 * Decision 12.2: one image is built and promoted from staging to production,
 * so nothing environment-specific may be inlined at build time. That is why
 * these variables do not carry the NEXT_PUBLIC_ prefix: Next replaces every
 * `process.env.NEXT_PUBLIC_*` it can see at build with the build's value, in
 * the server bundles and the middleware too. The server reads these names
 * per request and hands the result to the browser (src/env/public-config-script.tsx),
 * and client code reads it through src/env/client.ts.
 *
 * Isomorphic and pure: no Node APIs, no `process.env` read of its own (the
 * caller passes the environment), so the middleware (edge), the server and
 * the tests share it.
 *
 * And no zod: this module is in every page's bundle (src/env/client.ts reads
 * the configuration through it), public site included, and zod alone was
 * ~12.7 KB gzip of it. The strict schema lives in public-config-schema.ts,
 * for the server's boot check and the tests; the browser only reads back
 * JSON the server already validated, through `readPublicConfig`.
 */

import {
  resolveMapTiles,
  type MapTiles,
} from "@/features/control-tower/lib/map-tiles";
import type { AppEnv } from "@/lib/site";

import { LEGACY_NAMES, PUBLIC_ENV } from "./names";

type EnvSource = Record<string, string | undefined>;

const APP_ENVS: readonly AppEnv[] = ["development", "staging", "production"];

/** An absolute http(s) URL: what zod's `.url()` plus the protocol check accepted. */
function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** What the browser receives (public-config-schema.ts holds the zod twin). */
interface PublicConfig {
  apiUrl: string;
  socketUrl: string;
  siteUrl: string | null;
  turnstileSiteKey: string | null;
  appEnv: AppEnv;
  mapTiles: MapTiles | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTileSource(
  value: unknown,
): value is { url: string; attribution: string } {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    typeof value.attribution === "string"
  );
}

/** The tiles as the schema has them; `false` for any other shape. */
function readMapTiles(value: unknown): MapTiles | null | false {
  if (value === null) return null;
  if (!isTileSource(value)) return false;

  const { dark } = value as { dark?: unknown };

  if (dark !== undefined && !isTileSource(dark)) return false;

  return {
    url: value.url,
    attribution: value.attribution,
    ...(dark ? { dark: { url: dark.url, attribution: dark.attribution } } : {}),
  };
}

/**
 * The browser's reader for the configuration the server rendered (or served
 * at /public-config.json): the same rules as the zod schema, field by field,
 * and only the known fields kept. Null for anything else, as `safeParse`
 * failing was.
 */
function readPublicConfig(value: unknown): PublicConfig | null {
  if (!isRecord(value)) return null;

  const { apiUrl, socketUrl, siteUrl, turnstileSiteKey, appEnv, mapTiles } =
    value;

  if (!isHttpUrl(apiUrl) || !isHttpUrl(socketUrl)) return null;
  if (siteUrl !== null && !isHttpUrl(siteUrl)) return null;

  if (
    turnstileSiteKey !== null &&
    (typeof turnstileSiteKey !== "string" || turnstileSiteKey.length === 0)
  ) {
    return null;
  }

  if (
    typeof appEnv !== "string" ||
    !(APP_ENVS as readonly string[]).includes(appEnv)
  )
    return null;

  const tiles = readMapTiles(mapTiles);

  if (tiles === false) return null;

  return {
    apiUrl,
    socketUrl,
    siteUrl,
    turnstileSiteKey,
    appEnv: appEnv as AppEnv,
    mapTiles: tiles,
  };
}

type PublicConfigResult =
  | { ok: true; config: PublicConfig; warnings: string[] }
  | { ok: false; issues: string[]; warnings: string[] };

function value(env: EnvSource, name: string): string | undefined {
  const raw = env[name]?.trim();

  return raw ? raw : undefined;
}

/**
 * APP_ENV the way src/lib/site.ts reads it: unset counts as production in a
 * production server and development otherwise; an unknown value fails closed
 * as staging (never indexed, no OSM fallback).
 */
function appEnvFrom(env: EnvSource): AppEnv {
  const raw = value(env, PUBLIC_ENV.appEnv)?.toLowerCase();

  if (!raw) return env.NODE_ENV === "production" ? "production" : "development";

  return (APP_ENVS as readonly string[]).includes(raw)
    ? (raw as AppEnv)
    : "staging";
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function urlIssue(
  name: string,
  raw: string | undefined,
  required: boolean,
): string | null {
  if (!raw) {
    if (!required) return null;

    const legacy = LEGACY_NAMES[name];

    return `${name}: obrigatória${legacy ? ` (substitui ${legacy})` : ""}`;
  }

  // The message names the variable, never its value: a URL can carry a key.
  return isHttpUrl(raw)
    ? null
    : `${name}: URL inválida (precisa ser http:// ou https://)`;
}

/**
 * Parses the public configuration from an environment. Strict: a missing
 * required value is an issue, so the boot check and the layout agree on
 * what "configured" means.
 */
function parsePublicConfig(env: EnvSource): PublicConfigResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const production = env.NODE_ENV === "production";
  const appEnv = appEnvFrom(env);

  const apiUrl = value(env, PUBLIC_ENV.apiUrl);
  const socketUrl = value(env, PUBLIC_ENV.socketUrl);
  const siteUrl = value(env, PUBLIC_ENV.siteUrl);
  const turnstileSiteKey = value(env, PUBLIC_ENV.turnstileSiteKey) ?? null;
  const tileUrl = value(env, PUBLIC_ENV.mapTileUrl);
  const darkTileUrl = value(env, PUBLIC_ENV.mapTileUrlDark);

  for (const issue of [
    urlIssue(PUBLIC_ENV.apiUrl, apiUrl, true),
    urlIssue(PUBLIC_ENV.socketUrl, socketUrl, false),
    urlIssue(PUBLIC_ENV.siteUrl, siteUrl, production),
  ]) {
    if (issue) issues.push(issue);
  }

  // The login, password recovery and quote forms render the captcha in a
  // production server only, and the API refuses them without its token.
  if (production && !turnstileSiteKey) {
    issues.push(
      `${PUBLIC_ENV.turnstileSiteKey}: obrigatória em produção (substitui ${LEGACY_NAMES.TURNSTILE_SITE_KEY})`,
    );
  }

  const mapTiles = resolveMapTiles({
    url: tileUrl,
    attribution: value(env, PUBLIC_ENV.mapTileAttribution),
    darkUrl: darkTileUrl,
    darkAttribution: value(env, PUBLIC_ENV.mapTileAttributionDark),
    appEnv,
  });

  // The dark style is optional; a broken one fails the boot like the light
  // one, rather than silently falling back to the filter.
  if (darkTileUrl && mapTiles && mapTiles.dark?.url !== darkTileUrl) {
    issues.push(
      `${PUBLIC_ENV.mapTileUrlDark}: modelo inválido (https com {z}, {x} e {y}; {s} opcional)`,
    );
  } else if (darkTileUrl && !mapTiles) {
    warnings.push(
      `${PUBLIC_ENV.mapTileUrlDark}: ignorada sem ${PUBLIC_ENV.mapTileUrl}; o tema escuro precisa do mapa claro como base`,
    );
  } else if (
    darkTileUrl &&
    !value(env, PUBLIC_ENV.mapTileAttributionDark) &&
    value(env, PUBLIC_ENV.mapTileAttribution)
  ) {
    warnings.push(
      `${PUBLIC_ENV.mapTileAttributionDark}: não definida; o mapa escuro usa o crédito de ${PUBLIC_ENV.mapTileAttribution}`,
    );
  }

  if (tileUrl && (!mapTiles || mapTiles.url !== tileUrl)) {
    issues.push(
      `${PUBLIC_ENV.mapTileUrl}: modelo inválido (https com {z}, {x} e {y}; {s} opcional)`,
    );
  } else if (tileUrl && !value(env, PUBLIC_ENV.mapTileAttribution)) {
    // The maps would credit a generic "provedor de mapas"; tile providers'
    // terms (and OSM-derived data) require their own credit on screen.
    warnings.push(
      `${PUBLIC_ENV.mapTileAttribution}: não definida; o mapa mostra um crédito genérico, e o provedor de tiles exige o dele`,
    );
  } else if (!tileUrl && appEnv !== "development") {
    // Not fatal: the maps still draw the fleet and the pins, on a blank
    // canvas, and say so. Public OSM is development only (decision 7.4).
    warnings.push(
      `${PUBLIC_ENV.mapTileUrl}: não definida; torre, página da rota e seletor de local ficam sem mapa de fundo`,
    );
  }

  if (issues.length > 0) return { ok: false, issues, warnings };

  const api = withoutTrailingSlash(apiUrl!);

  return {
    ok: true,
    warnings,
    config: {
      apiUrl: api,
      socketUrl: socketUrl ? withoutTrailingSlash(socketUrl) : api,
      siteUrl: siteUrl ? new URL(siteUrl).origin : null,
      turnstileSiteKey,
      appEnv,
      mapTiles,
    },
  };
}

/**
 * The configuration as JSON safe to place inside a <script> element.
 *
 * JSON.stringify leaves `<`, `>` and `&` as they are, so a value holding
 * `</script>` would close the element and whatever follows would run as
 * markup. Escaping them (and the two line separators old parsers choke on)
 * keeps the text inert in HTML and still yields the same value to JSON.parse.
 */
function serializePublicConfig(config: PublicConfig): string {
  return JSON.stringify(config)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** The DOM id of the element the root layout writes the configuration into. */
const PUBLIC_CONFIG_ELEMENT_ID = "public-config";

/** Where a page without the element (a prerendered one) fetches it from. */
const PUBLIC_CONFIG_PATH = "/public-config.json";

export {
  PUBLIC_CONFIG_ELEMENT_ID,
  PUBLIC_CONFIG_PATH,
  PUBLIC_ENV,
  appEnvFrom,
  isHttpUrl,
  parsePublicConfig,
  readPublicConfig,
  serializePublicConfig,
};
export type { EnvSource, MapTiles, PublicConfig, PublicConfigResult };
